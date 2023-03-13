import { ListStatus, ModerationStatus, PrismaClient } from '@prisma/client';
import { ShareableList, ShareableListComplete } from '../types';
import { ForbiddenError, NotFoundError } from '@pocket-tools/apollo-utils';
import { ACCESS_DENIED_ERROR } from '../../shared/constants';

/**
 * This is a public query, which is why we only return
 * a subset of ShareableList properties.
 * Retrieves a single list for a given userId from the datastore.
 *
 * @param db
 * @param userId
 * @param externalId
 */
export function getShareableList(
  db: PrismaClient,
  userId: number | bigint,
  externalId: string
): Promise<ShareableList> {
  // externalId is unique, but the generated type for `findUnique` here doesn't
  // include `moderationStatus`, so using `findFirst` instead
  return db.list.findFirst({
    where: {
      userId,
      externalId,
      moderationStatus: ModerationStatus.VISIBLE,
    },
    include: {
      listItems: true,
    },
  });
}

/**
 * This query returns a publicly viewable Shareable List,
 * retrieved by its external ID
 *
 * @param db
 * @param externalId
 */
export async function getShareableListPublic(
  db: PrismaClient,
  externalId: string
): Promise<ShareableList> {
  // externalId is unique, but the generated type for `findUnique` here doesn't
  // include `status`, so using `findFirst` instead
  const list = await db.list.findFirst({
    where: {
      externalId,
      status: ListStatus.PUBLIC,
    },
    include: {
      listItems: true,
    },
  });

  // For mistyped URLs or lists that were switched from public back to private.
  if (!list) {
    throw new NotFoundError(`A list by that URL could not be found`);
  }

  // For lists taken down for violating the Pocket content moderation policies.
  if (list.moderationStatus === ModerationStatus.HIDDEN) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }

  return list;
}

/**
 * This is a public query.
 * Retrieves all available shareable lists for a given userId from the datastore.
 *
 * @param db
 * @param userId
 */
export function getShareableLists(
  db: PrismaClient,
  userId: number | bigint
): Promise<ShareableList[]> {
  return db.list.findMany({
    where: {
      userId,
      moderationStatus: ModerationStatus.VISIBLE,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      listItems: true,
    },
  });
}

/**
 * This is an admin query.
 * Searches for a single list by externalId for any user from the datastore.
 *
 * @param db
 * @param externalId
 */
export function searchShareableList(
  db: PrismaClient,
  externalId: string
): Promise<ShareableListComplete> {
  return db.list.findUnique({
    where: {
      externalId,
    },
    include: {
      listItems: true,
    },
  });
}
