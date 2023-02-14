import { List, ListItem } from '@prisma/client';

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
  // optional as not needed for returning when creating a ShareableList atm
  listItems?: ShareableListItem[];
};

export type CreateShareableListInput = {
  title: string;
  description?: string;
};
