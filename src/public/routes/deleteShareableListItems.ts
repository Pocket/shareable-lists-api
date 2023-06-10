import { Request, Response } from 'express';
import { Router } from 'express';
import { checkSchema, Schema } from 'express-validator';
import * as Sentry from '@sentry/node';
import { client } from '../../database/client';
import { validate } from './';

const router = Router();
const db = client();

const deleteShareableListItemDataSchema: Schema = {
  userId: {
    in: ['body'],
    errorMessage: 'Must provide valid userId',
    isInt: true,
    toInt: true,
  },
  url: {
    in: ['body'],
    errorMessage: 'Must provide valid url',
    isString: true,
    notEmpty: true,
  },
};

/**
 * This method batch deletes shareable list items by url for a user
 * @param userId
 * @param url
 */
export async function batchDeleteAllListItemsForUser(
  userId: number | bigint,
  url: string
): Promise<number> {
  const batchResult = await db.listItem.deleteMany({
    where: { url, list: { userId } },
  });

  return batchResult.count;
}

/**
 * This method deletes all shareable list item data for a user by url
 * @param userId
 * @param url
 */
async function deleteShareableListItemUserData(
  userId: number | bigint,
  url: string
): Promise<string> {
  // Delete all list items if there are any for user
  try {
    const deletedListItemCount = await batchDeleteAllListItemsForUser(
      userId,
      url
    );
    if (deletedListItemCount === 0) {
      return `No shareable list items found for User ID: ${userId}`;
    }
    return `Deleting shareable list items for User ID: ${userId}`;
  } catch (error) {
    // some unexpected DB error, log to Sentry, but don't halt program
    Sentry.captureException('Failed to delete shareable list data: ', error);
  }
}

router.post(
  '/',
  checkSchema(deleteShareableListItemDataSchema),
  validate,
  (req: Request, res: Response) => {
    const userId = req.body.userId;
    const url = req.body.url;

    // Delete all shareable list items for userId by url from DB
    deleteShareableListItemUserData(userId, url)
      .then((result) => {
        return res.send({
          status: 'OK',
          message: result,
        });
      })
      .catch((e) => {
        // In the unlikely event that an error is thrown,
        // log to Sentry but don't halt program
        Sentry.captureException(e);
        return res.send({
          status: 'BAD_REQUEST',
          message: e,
        });
      });
  }
);

export default router;
