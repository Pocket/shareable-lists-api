import { List, ListItem, PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

interface ListItemHelperInput {
  // Provide the parent list Prisma object to be able to link the item to it
  list: List;
  itemId?: number;
  url?: string;
  note?: string;
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
    itemId: data.itemId ?? faker.datatype.number(),
    url: data.url ?? `${faker.internet.url()}/${faker.lorem.slug(5)}`,
    // if `null` is passed in, do not add a note to the list item
    note: data.note === undefined ? faker.lorem.sentences(2) : data.note,
    // allow sortOrder to fall back to db default if no specific order given
    sortOrder: data.sortOrder ?? undefined,
  };

  return await prisma.listItem.create({
    data: input,
  });
}
