import { List, ListStatus, PrismaClient } from '@prisma/client';

interface UpdateListHelperInput {
  status: ListStatus;
  slug: string;
}

/**
 * Updates a Shareable List
 *
 * @param prisma
 * @param externalId
 * @param data
 */
export async function updateShareableListHelper(
  prisma: PrismaClient,
  externalId: string,
  data: UpdateListHelperInput
): Promise<List> {
  const input: UpdateListHelperInput = {
    status: data.status,
    slug: data.slug,
  };

  return prisma.list.update({
    data: input,
    where: { externalId },
  });
}
