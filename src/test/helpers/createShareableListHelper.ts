import { List, PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import slugify from 'slugify';
import config from '../../config';

interface ListHelperInput {
  userId: number | bigint;
  title: string;
  slug?: string;
  description?: string;
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
  const listSlug = data.slug ?? slugify(listTitle, config.slugify);

  const input: ListHelperInput = {
    userId: data.userId ?? faker.datatype.number(),
    title: listTitle,
    slug: listSlug,
    description: data.description ?? faker.lorem.sentences(2),
  };

  return await prisma.list.create({
    data: input,
  });
}
