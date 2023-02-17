import { UserInputError, NotFoundError } from '@pocket-tools/apollo-utils';
import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { CreateShareableListInput, ShareableList } from '../types';

const PRISMA_RECORD_NOT_FOUND = "P2025";

/**
 * This mutation creates a shareable list, and _only_ a shareable list
 *
 * @param db
 * @param data
 * @param userId
 */
export async function createShareableList(
  db: PrismaClient,
  data: CreateShareableListInput,
  userId: number | bigint
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
    include: {
      listItems: true,
    },
  });
}

/**
 * This method deletes a shareable list. if the owner of the list 
 * represented by externalId matches the owner of the list. 
 * 
 * @param db
 * @param externalId
 * @param userId
 */
export async function deleteShareableList(
  db: PrismaClient,
  externalId: string,
  userId: number | bigint 
): Promise<String> {
  // Note for PR : input is unsanitized
  
  // Since we 404 both in the case where the list doesn't exist, and in the case 
  // where the owner is not the calling user, we can save a query by running 
  // a delete using the [unique] externalId and adding the userId as a query constraint.
  // This will most likely get replaced by a soft delete in a future revision anyway :) 
    const deletedList = await db.list.delete({
      where: { externalId: externalId, userId: userId },
    }).catch((error) => {
      // According to the Prisma docs, this should be a typed error 
      // of type PrismaClientKnownRequestError, with a code, but it doesn't 
      // come through typed
      if (error.code === PRISMA_RECORD_NOT_FOUND) {
        throw new NotFoundError(`List ${externalId} is not available`);
      } else {
        throw(error);
      }
    });
  
  console.log(deletedList);
  return deletedList.externalId;
}
