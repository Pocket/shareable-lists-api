import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { checkSchema, Schema, validationResult } from 'express-validator';
import * as Sentry from '@sentry/node';
import { client } from '../../database/client';
import { nanoid } from 'nanoid';

const router = Router();
const db = client();

const deleteUserDataSchema: Schema = {
  traceId: {
    in: ['body'],
    optional: true,
    isString: true,
    notEmpty: true,
  },
  userId: {
    in: ['body'],
    errorMessage: 'Must provide valid userId',
    isInt: true,
    toInt: true,
  },
};

/**
 * This method validates the request made to the endpoint
 * @param req
 * @param res
 * @param next
 */
function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors.array() })
      .setHeader('Content-Type', 'application/json');
  }
  next();
}

/**
 * This method returns an array of shareable list ids for a user
 * @param userId
 */
async function getAllShareableListIdsForUser(
  userId: number | bigint
): Promise<number[] | bigint[]> {
  const shareableLists = await db.list.findMany({
    where: {
      userId,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      listItems: true,
    },
  });
  const shareableListIds = [];
  shareableLists.forEach(function (list) {
    shareableListIds.push(parseInt(list.id as unknown as string));
  });
  return shareableListIds;
}

/**
 * This method deletes shareable list items in bulk for a user
 * @param listIds
 */
async function deleteShareableListItemsForUser(
  listIds: number[] | bigint[]
): Promise<number> {
  const batchResult = await db.listItem.deleteMany({
    where: { listId: { in: listIds } },
  });

  return batchResult.count;
}

/**
 * This method deletes all shareable list data for a user
 * @param userId
 * @param requestId
 */
async function deleteShareableListUserData(
  userId: number | bigint,
  requestId: string
): Promise<string> {
  const shareableListIds = await getAllShareableListIdsForUser(userId);
  // if there are no lists found for a userId, lets not make unecessary calls
  // to the db
  if (shareableListIds.length === 0) {
    return `No shareable list data to delete for User ID: ${userId} (requestId='${requestId}')`;
  } else if (shareableListIds.length > 0) {
    // First, delete all list items if there are any
    await deleteShareableListItemsForUser(shareableListIds);
    // Now, delete all lists
    await db.list
      .deleteMany({
        where: { userId },
      })
      .catch((error) => {
        // some unexpected DB error, log to Sentry, but don't halt program
        Sentry.captureException(
          'Failed to delete shareable list data: ',
          error
        );
      });
    return `Deleting shareable lists data for User ID: ${userId} (requestId='${requestId}')`;
  }
}

router.post(
  '/',
  checkSchema(deleteUserDataSchema),
  validate,
  (req: Request, res: Response) => {
    const requestId = req.body.traceId ?? nanoid();
    const userId = req.body.userId;

    // Delete all shareable lists data for userId from DB
    deleteShareableListUserData(userId, requestId)
      .then((result) => {
        return res.send({
          status: 'OK',
          message: result,
        });
      })
      .catch((e) => {
        // In the unlikely event that an error is thrown,
        // log to Sentry but don't halt program
        return res.send({
          status: 'BAD_REQUEST',
          message: e,
        });
        Sentry.captureException(e);
      });
  }
);

export default router;
