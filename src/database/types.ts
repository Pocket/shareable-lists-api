import { List, ListItem, ListStatus, ModerationStatus } from '@prisma/client';

/**
 * These are the properties of list items exposed on the public Pocket Graph -
 * props meant for the Admin Graph are omitted.
 */
export type ShareableListItem = Omit<ListItem, 'id' | 'externalId' | 'listId'>;

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

/**
 * This is the shape of a shareable list object on the admin Pocket Graph.
 */
export type ShareableListComplete = Omit<List, 'id'>;

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

export type ModerateShareableListInput = {
  externalId: string;
  moderationStatus: ModerationStatus;
  moderationReason: string;
  // not in the schema, copied from the request user data when updating
  moderatedBy: string;
};

export type CreateShareableListItemInput = {
  listExternalId: string;
  itemId?: number;
  url: string;
  title?: string;
  excerpt?: string;
  imageUrl?: string;
  publisher?: string;
  authors?: string;
  sortOrder: number;
};
