import { ModerationStatus, PrismaClient } from '@prisma/client';
import { ShareableList } from '../types';

/**
 * This is a public query, which is why we only return
 * a subset of ShareableList properties.
 *
 * @param db
 * @param userId
 * @param externalId
 */
export async function getShareableList(
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
    select: {
      externalId: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      moderationStatus: true,
      createdAt: true,
      updatedAt: true,
      listItems: {
        select: {
          url: true,
          title: true,
          excerpt: true,
          imageUrl: true,
          authors: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}
