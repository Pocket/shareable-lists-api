import { UserInputError } from '@pocket-tools/apollo-utils';
import { PrismaClient } from '@prisma/client';
import { CreateShareableListInput, ShareableList } from '../types';

/**
 * @param db
 * @param data
 */
export async function createShareableList(
  db: PrismaClient,
  data: CreateShareableListInput,
  userId: string
): Promise<ShareableList> {
  // check if the title already exists for this user
  const titleExists = await db.list.count({
    where: { title: data.title, userId: userId },
  });
  if (titleExists) {
    throw new UserInputError(
      `A list with the title "${data.title}" already exists`
    );
  }

  return db.list.create({
    data: { ...data, userId },
  });
}
