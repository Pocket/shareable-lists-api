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
  'id' | 'moderatedBy' | 'moderationReason' | 'moderationDetails'
> & {
  listItems?: ShareableListItem[];
};

export enum ShareableListModerationReason {
  ABUSIVE_BEHAVIOR = 'ABUSIVE_BEHAVIOR',
  POSTING_PRIVATE_INFORMATION = 'POSTING_PRIVATE_INFORMATION',
  HATE_SPEECH = 'HATE_SPEECH',
  MISLEADING_INFORMATION = 'MISLEADING_INFORMATION',
  ADULT_SEXUAL_CONTENT = 'ADULT_SEXUAL_CONTENT',
  CSAM_IMAGES = 'CSAM_IMAGES',
  CSAM_SOLICITATION = 'CSAM_SOLICITATION',
  ILLEGAL_GOODS_AND_SERVICES = 'ILLEGAL_GOODS_AND_SERVICES',
  VIOLENCE_AND_GORE = 'VIOLENCE_AND_GORE',
  INSTRUCTIONS_FOR_VIOLENCE = 'INSTRUCTIONS_FOR_VIOLENCE',
  INCITEMENT_TO_VIOLENCE = 'INCITEMENT_TO_VIOLENCE',
  SELF_HARM = 'SELF_HARM',
  TERRORISM = 'TERRORISM',
  COPYRIGHT = 'COPYRIGHT',
  TRADEMARK = 'TRADEMARK',
  COUNTERFEIT = 'COUNTERFEIT',
  SPAM = 'SPAM',
  FRAUD = 'FRAUD',
  MALWARE = 'MALWARE',
  PHISHING = 'PHISHING',
}

/**
 * This is the shape of a shareable list object on the Admin Pocket Graph.
 */
export type ShareableListComplete = Omit<List, 'id'> & {
  listItems?: ShareableListItem[];
};

export type CreateShareableListInput = {
  title: string;
  description?: string;
  listItem?: CreateShareableListItemInput;
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
  moderationReason: ShareableListModerationReason;
  moderationDetails?: string;
  // not in the schema, copied from the request user data when updating
  moderatedBy: string;
};

export type CreateShareableListItemInput = {
  listExternalId: string;
  itemId: string;
  url: string;
  title?: string;
  excerpt?: string;
  imageUrl?: string;
  publisher?: string;
  authors?: string;
  sortOrder: number;
};
