import { NotFoundError, UserInputError } from '@pocket-tools/apollo-utils';
import { ListStatus, PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import {
  CreateShareableListInput,
  ShareableList,
  UpdateShareableListInput,
} from '../types';
import { getShareableList } from '../queries';
import config from '../../config';

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
  // let's generate a slug from the title with a string of random numbers
  // at the end.
  if (data.status === ListStatus.PUBLIC && !list.slug) {
    // If an updated title is provided, generate the slug from that,
    // otherwise default to the title saved previously.
    data.slug = slugify(data.title ?? list.title, config.slugify);

    // Append a dash and a random ten-digit number at the end of the slug.
    data.slug += `-${parseInt(String(Math.random() * 10000000000), 10)}`;

    // Verify that this slug is unique to this user
    const slugExists = await db.list.count({
      where: { slug: data.slug, userId: userId },
    });

    if (slugExists) {
      throw new UserInputError(
        `A list with the slug "${data.slug}" already exists`
      );
    }
  }

  return db.list.update({
    data,
    where: { externalId: data.externalId },
    include: {
      listItems: true,
    },
  });
}
