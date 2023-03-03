import { PrismaClient } from '@prisma/client';

/**
 * Retrieves the number of users in the PilotUser table with the given userid
 *
 * @param db
 * @param userId
 */
export function isPilotUser(
  db: PrismaClient,
  userId: number | bigint
): Promise<number> {
  return db.pilotUser.count({
    where: {
      userId,
    },
  });
}
