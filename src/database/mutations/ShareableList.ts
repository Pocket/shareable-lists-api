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
  UpdateShareableListInput,
} from '../types';
import { ACCESS_DENIED_ERROR } from '../../shared/constants';
import { getShareableList } from '../queries';
import config from '../../config';

const PRISMA_RECORD_NOT_FOUND = 'P2025';

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

  return db.list.create({
    data: { ...data, userId },
    include: {
      listItems: true,
    },
  });
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
  // let's generate a slug from the title. Once set, it will not be
  // updated to sync with any further title edits.
  if (data.status === ListStatus.PUBLIC && !list.slug) {
    // If an updated title is provided, generate the slug from that,
    // otherwise default to the title saved previously.
    data.slug = slugify(data.title ?? list.title, config.slugify);
  }

  return db.list.update({
    data,
    where: { externalId: data.externalId },
    include: {
      listItems: true,
    },
  });
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
  return deleteList;
}
