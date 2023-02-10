import { PrismaClient } from '@prisma/client';
import { CreateShareableListInput, ShareableList } from '../database/types';
import { faker } from '@faker-js/faker';

// information required to create a List
export async function createShareableListHelper(
  prisma: PrismaClient,
  title?: string,
  userId?: string
): Promise<ShareableList> {
  const data: CreateShareableListInput = {
    title: title || faker.random.words(2),
    description: faker.lorem.sentences(2),
  };

  userId = userId || faker.internet.userName();

  return await prisma.list.create({ data: { ...data, userId } });
}

export async function clear(prisma: PrismaClient): Promise<void> {
  // lists
  await prisma.list.deleteMany({});
}
