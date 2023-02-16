import { NotFoundError, UserInputError } from '@pocket-tools/apollo-utils';
import { PrismaClient } from '@prisma/client';
import { CreateShareableListItemInput, ShareableListItem } from '../types';

/**
 * This mutation creates a shareable list item.
 *
 * @param db
 * @param data
 * @param userId
 */
export async function createShareableListItem(
  db: PrismaClient,
  data: CreateShareableListItemInput,
  userId: number | bigint
): Promise<ShareableListItem> {
  // Retrieve the list this item should be added to
  const list = await db.list.findUnique({
    where: { externalId: data.listExternalId },
  });

  if (!list) {
    throw new NotFoundError(
      `A list with the title "${data.listExternalId}" does not exist`
    );
  }

  // check if an item with this URL already exists in this list
  const itemExists = await db.listItem.count({
    where: { listId: list.id, url: data.url },
  });

  if (itemExists) {
    throw new UserInputError(
      `An item with the title "${data.url}" already exists in this list`
    );
  }

  const input = {
    url: data.url,
    title: data.title ?? undefined,
    excerpt: data.excerpt ?? undefined,
    imageUrl: data.imageUrl ?? undefined,
    authors: data.authors ?? undefined,
    sortOrder: data.sortOrder,
    listId: list.id,
  };

  return db.listItem.create({
    data: input,
  });
}
