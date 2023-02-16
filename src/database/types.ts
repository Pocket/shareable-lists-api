import { List, ListItem, ListStatus } from '@prisma/client';

/**
 * These are the properties of list items exposed on the public Pocket Graph -
 * props meant for the Admin Graph are omitted.
 */
export type ShareableListItem = Omit<
  ListItem,
  'id' | 'externalId' | 'listId' | 'itemId'
>;

/**
 * This is the shape of a shareable list object on the public Pocket Graph -
 * properties meant for the Admin Graph are omitted.
 */
export type ShareableList = Omit<
  List,
  'id' | 'userId' | 'moderatedBy' | 'moderationReason'
> & {
  listItems?: ShareableListItem[];
};

export type CreateShareableListInput = {
  title: string;
  description?: string;
};

export type UpdateShareableListInput = {
  externalId: string;
  title?: string;
  description?: string;
  status?: ListStatus;
  // Not in the public schema but here in the DB input type
  // because it's generated in the DB resolver if required.
  slug?: string;
};
