import { List, ListItem, PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

interface ListItemHelperInput {
  // Provide the parent list Prisma object to be able to link the item to it
  list: List;
  itemId?: number;
  url?: string;
  title?: string;
  excerpt?: string;
  imageUrl?: string;
  publisher?: string;
  authors?: string;
  sortOrder?: number;
}

/**
 * Generates a List Item for a given Shareable List with supplied
 * or randomised values.
 *
 * @param prisma
 * @param data
 */
export async function createShareableListItemHelper(
  prisma: PrismaClient,
  data: ListItemHelperInput
): Promise<ListItem> {
  const input = {
    listId: data.list.id,
    // if 0 was explicitly sent, do NOT include an itemId. this is to mimic old
    // data that's missing itemId in the db. once we've backfilled the old data
    // we can revert this conditional to:
    // itemId: data.itemId ?? faker.datatype.number()
    // https://getpocket.atlassian.net/browse/OSL-338
    itemId: data.itemId === 0 ? null : faker.datatype.number(),
    url: data.url ?? `${faker.internet.url()}/${faker.lorem.slug(5)}`,
    title: data.title ?? faker.random.words(5),
    excerpt: data.excerpt ?? faker.lorem.sentences(2),
    imageUrl: data.imageUrl ?? faker.image.cats(),
    publisher: data.publisher ?? faker.company.name(),
    authors: data.authors ?? faker.name.fullName(),
    sortOrder: data.sortOrder ?? faker.datatype.number(),
  };

  return await prisma.listItem.create({
    data: input,
  });
}
