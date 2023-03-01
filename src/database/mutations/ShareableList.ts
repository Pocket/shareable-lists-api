import {
  ForbiddenError,
  NotFoundError,
  UserInputError,
} from '@pocket-tools/apollo-utils';
import { ListStatus, PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import {
  CreateShareableListInput,
  ShareableList,
  ShareableListComplete,
  UpdateShareableListInput,
} from '../types';
import { deleteAllListItemsForList } from './ShareableListItem';
import {
  ACCESS_DENIED_ERROR,
  LIST_TITLE_MAX_CHARS,
  LIST_DESCRIPTION_MAX_CHARS,
  PRISMA_RECORD_NOT_FOUND,
} from '../../shared/constants';
import { getShareableList } from '../queries';
import config from '../../config';
import { sendEventHelper as sendEvent } from '../../snowplow/events';
import { EventBridgeEventType } from '../../snowplow/types';

/**
 * This mutation creates a shareable list, and _only_ a shareable list
 *
 * @param db
 * @param data
 * @param userId
 */
export async function createShareableList(
  db: PrismaClient,
  data: CreateShareableListInput,
  userId: number | bigint
): Promise<ShareableList> {
  // check if the title already exists for this user
  const titleExists = await db.list.count({
    where: { title: data.title, userId: userId },
  });

  if (titleExists) {
    throw new UserInputError(
      `A list with the title "${data.title}" already exists`
    );
  }

  // check the length of the title (fail if title > 100 chars)
  if (data.title.length > LIST_TITLE_MAX_CHARS) {
    throw new UserInputError(
      'List title must not be longer than 100 characters'
    );
  }

  // check the length of the description (fail if description > 200 chars)
  if (
    data.description &&
    data.description.length > LIST_DESCRIPTION_MAX_CHARS
  ) {
    throw new UserInputError(
      'List description must not be longer than 200 characters'
    );
  }

  const list = await db.list.create({
    data: { ...data, userId },
    include: {
      listItems: true,
    },
  });

  //send event bridge event for shareable-list-created event type
  await sendEvent(EventBridgeEventType.SHAREABLE_LIST_CREATED, {
    shareableList: list as ShareableListComplete,
    isShareableListEventType: true,
  });

  return list;
}

/**
 * This mutation updates a shareable list, including making it public.
 *
 * @param db
 * @param data
 * @param userId
 */
export async function updateShareableList(
  db: PrismaClient,
  data: UpdateShareableListInput,
  userId: number | bigint
): Promise<ShareableList> {
  // Retrieve the current record, pre-update
  const list = await getShareableList(db, userId, data.externalId);

  if (!list) {
    throw new NotFoundError(`A list by that ID could not be found`);
  }

  // If the title is getting updated, check if the user already has a list
  // with the same title.
  if (data.title) {
    const titleExists = await db.list.count({
      where: { title: data.title, userId: userId },
    });

    if (titleExists) {
      throw new UserInputError(
        `A list with the title "${data.title}" already exists`
      );
    }
  }

  // If there is no slug and the list is being shared with the world,
  // let's generate a unique slug from the title. Once set, it will not be
  // updated to sync with any further title edits.
  if (data.status === ListStatus.PUBLIC && !list.slug) {
    // First check how many slugs containing the list title already exist in the db
    const slugCount = await db.list.count({
      where: {
        userId,
        slug: { contains: slugify(data.title ?? list.title, config.slugify) },
      },
    });
    // if there is at least 1 slug containing title of list to update,
    // append next consecutive # of slugCount to data.slug
    if (slugCount) {
      data.slug =
        slugify(data.title ?? list.title, config.slugify) +
        ('-' + (slugCount + 1));
    } else {
      // If an updated title is provided, generate the slug from that,
      // otherwise default to the title saved previously.
      data.slug = slugify(data.title ?? list.title, config.slugify);
    }
  }
  const updatedList = await db.list.update({
    data,
    where: { externalId: data.externalId },
    include: {
      listItems: true,
    },
  });

  // this mutation does a lot of things so we need to break down the operations to determine
  // what events to send to snowplow

  // if list was published, send event bridge event for shareable-list-published event type
  if (data.status === ListStatus.PUBLIC) {
    await sendEvent(EventBridgeEventType.SHAREABLE_LIST_PUBLISHED, {
      shareableList: updatedList as ShareableListComplete,
      isShareableListEventType: true,
    });
  }
  // if list was unpublished, send event bridge event for shareable-list-unpublished event type
  if (data.status === ListStatus.PRIVATE) {
    await sendEvent(EventBridgeEventType.SHAREABLE_LIST_UNPUBLISHED, {
      shareableList: updatedList as ShareableListComplete,
      isShareableListEventType: true,
    });
  }
  // if only list title or description are updated, send event bridge event for shareable-list-updated event type
  if (data.title || data.description) {
    await sendEvent(EventBridgeEventType.SHAREABLE_LIST_UPDATED, {
      shareableList: updatedList as ShareableListComplete,
      isShareableListEventType: true,
    });
  }

  return updatedList;
}

/**
 * This method deletes a shareable list, if the owner of the list
 * represented by externalId matches the owner of the list.
 *
 * @param db
 * @param externalId
 * @param userId
 */
export async function deleteShareableList(
  db: PrismaClient,
  externalId: string,
  userId: number | bigint
): Promise<ShareableList> {
  // Note for PR : input is unsanitized
  const deleteList = await db.list.findUnique({
    where: { externalId: externalId },
    include: { listItems: true },
  });
  if (deleteList === null) {
    throw new NotFoundError(`List ${externalId} cannot be found.`);
  } else if (deleteList.userId !== BigInt(userId)) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }
  // This delete must occur before the list is actually deleted,
  // due to a foreign key constraint on ListIitems. We should remove this
  // foreign key constraint for a number of reasons.
  // In the small context here of deletes, the foreign key constraint makes
  // this action both less safe and slower:
  // Less safe: If the list item deletion encounters a failure partway through
  // the list will remain in place, and will also be mangled. In this case it
  // would be far preferable to guarantee deletion of the list entity -- thus removing
  // it from userspace -- first. It is not critical that the list item table be
  // consistent; there is no harm (other than disk space) in orphaned list item rows,
  // and we're eventually going to need to clean things up anyway.
  // Slower: Without the foreign key constraint, we do not need to `await` the result
  // of the list item deletion, it could happen asynchronously
  // For these and similar reasons foreign keys are typically not used in environments
  // running at high scale (e.g. Etsy, etc)
  // Leaving this in now so we can discuss and circle back and keep moving :)
  await deleteAllListItemsForList(db, deleteList.id);

  // Now that we've checked that we can delete the list, let's delete it.
  // We'll catch the case where the list has been deleted under us, to
  // account for a potential race conditions.
  // This operation is possible to execute with one query, using both the
  // externalId and the target userId but requires that the `extendedWhereUnique`
  // prisma preview flag be enabled.
  // We don't need the return value here, since we have it above, so we
  // tell prisma to not select anything
  await db.list
    .delete({
      where: { id: deleteList.id },
      select: { id: true },
    })
    .catch((error) => {
      // According to the Prisma docs, this should be a typed error
      // of type PrismaClientKnownRequestError, with a code, but it doesn't
      // come through typed
      if (error.code === PRISMA_RECORD_NOT_FOUND) {
        throw new NotFoundError(`List ${externalId} cannot be found.`);
      } else {
        // some unexpected DB error
        throw error;
      }
    });

  //send event bridge event for shareable-list-deleted event type
  await sendEvent(EventBridgeEventType.SHAREABLE_LIST_DELETED, {
    shareableList: deleteList as ShareableListComplete,
    isShareableListEventType: true,
  });
  return deleteList;
}
