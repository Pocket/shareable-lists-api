import { Visibility, ModerationStatus, Prisma } from '@prisma/client';

/**
 * Source of truth: https://getpocket.atlassian.net/wiki/spaces/PE/pages/2584150049/Pocket+Shared+Data
 */
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
 * These are the properties of list items exposed on both the Public and Admin graphs.
 *
 * New and improved way of setting up custom types that contain a subset of Prisma
 * model properties while taking advantage of Prisma validation and type safety.
 * (see more at https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/operating-against-partial-structures-of-model-types)
 */
export const shareableListItemSelectFields =
  Prisma.validator<Prisma.ListItemSelect>()({
    externalId: true,
    itemId: true,
    url: true,
    title: true,
    excerpt: true,
    imageUrl: true,
    publisher: true,
    authors: true,
    sortOrder: true,
    createdAt: true,
    updatedAt: true,
  });

const shareableListItem = Prisma.validator<Prisma.ListItemArgs>()({
  select: shareableListItemSelectFields,
});
export type ShareableListItem = Prisma.ListItemGetPayload<
  typeof shareableListItem
>;

/**
 * This is the shape of a shareable list object on the public Pocket Graph -
 * properties meant for the Admin Graph are omitted.
 *
 * Note that the included list items also pull in a subset of properties
 * for the types to match.
 */
const shareableListSelectFields = {
  externalId: true,
  userId: true,
  slug: true,
  title: true,
  description: true,
  status: true,
  moderationStatus: true,
  createdAt: true,
  updatedAt: true,
  listItems: { select: shareableListItemSelectFields },
};
const shareableList = Prisma.validator<Prisma.ListArgs>()({
  select: shareableListSelectFields,
});
export type ShareableList = Prisma.ListGetPayload<typeof shareableList>;

/**
 * This is the shape of a shareable list object on the Admin Pocket Graph:
 * the public list + additional props meant for the moderators' eyes only.
 */
const shareableListCompleteSelectFields = {
  ...shareableListSelectFields,
  moderatedBy: true,
  moderationReason: true,
  moderationDetails: true,
};
const shareableListComplete = Prisma.validator<Prisma.ListArgs>()({
  select: shareableListCompleteSelectFields,
});
export type ShareableListComplete = Prisma.ListGetPayload<
  typeof shareableListComplete
>;

export type CreateShareableListInput = {
  title: string;
  description?: string;
  listItem?: CreateShareableListItemInput;
};

export type UpdateShareableListInput = {
  externalId: string;
  title?: string;
  description?: string;
  status?: Visibility;
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
