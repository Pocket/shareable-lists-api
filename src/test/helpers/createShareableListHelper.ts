import { List, ModerationStatus, PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

interface ListHelperInput {
  userId: number | bigint;
  title: string;
  description?: string;
  moderationStatus?: ModerationStatus;
}

/**
 * Generates a Shareable List with supplied or randomised values.
 *
 * @param prisma
 * @param data
 */
export async function createShareableListHelper(
  prisma: PrismaClient,
  data: ListHelperInput
): Promise<List> {
  const listTitle = data.title ?? faker.random.words(2);

  const input: ListHelperInput = {
    userId: data.userId ?? faker.datatype.number(),
    title: listTitle,
    description: data.description ?? faker.lorem.sentences(2),
    moderationStatus: data.moderationStatus ?? ModerationStatus.VISIBLE,
  };

  return await prisma.list.create({
    data: input,
  });
}
