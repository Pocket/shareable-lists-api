import {
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry,
} from '@aws-sdk/client-sqs';
import { Request, Response } from 'express';
import { Router } from 'express';
import { checkSchema, Schema } from 'express-validator';
import { nanoid } from 'nanoid';
import * as Sentry from '@sentry/node';

import { validate } from '.';
import config from '../../config';
import { client } from '../../database/client';
import { serverLogger } from '../../express';
import { sqs } from '../../aws/sqs';

const router = Router();
const db = client();

// the body of the sqs message, essentially
export type QueueDeleteShareableListItemsSqsMessage = {
  // keeping userId and url in the message for logging purposes.
  // may not be necessary, but it's a small amount of data that could be
  // very helpful in debugging...
  userId: number;
  url: string;
  externalIds: string[];
};

const queueDeleteShareableListItemDataSchema: Schema = {
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
/*
TODO: will be refactored/moved in https://getpocket.atlassian.net/browse/OSL-563
export async function batchDeleteAllListItemsForUser(
  userId: number | bigint,
  url: string
): Promise<number> {
  const batchResult = await db.listItem.deleteMany({
    where: { url, list: { userId } },
  });

  return batchResult.count;
}
*/

/**
 * This method deletes all shareable list item data for a user by url
 * @param userId
 * @param url
 */
/*
TODO: will be refactored/moved in https://getpocket.atlassian.net/browse/OSL-563
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
*/

/**
 * yield chunks of a given list of external IDs
 * @param list
 * @param size
 */
function* chunk(list: string[], size = 1000): Generator<string[]> {
  for (let i = 0; i < list.length; i += size) {
    yield list.slice(i, i + size);
  }
}

/**
 * convert a JSON object to an SQS send message entry
 * @param message
 */
export function convertToSqsEntry(
  message: QueueDeleteShareableListItemsSqsMessage
): SendMessageBatchRequestEntry {
  return {
    // copied this Id pattern from annotations API - but i don't really
    // understand the details of how this Id is to be used.
    // if someone has a link to relevant docs, please submit a PR?
    Id: nanoid(),
    MessageBody: JSON.stringify(message),
  };
}

/**
 * build command for sending messages to the delete queue,
 * for deleting list item data after save deletion.
 * @param entries
 */
function buildSqsCommand(
  entries: SendMessageBatchRequestEntry[]
): SendMessageBatchCommand {
  const command = new SendMessageBatchCommand({
    Entries: entries,
    QueueUrl: config.aws.sqs.listItemsDeleteQueue.url,
  });

  return command;
}

/**
 * queries (in batches) the database for all list item externalIds matching the
 * given userId and url. sends batches of found externalIds to SQS for later
 * processing.
 *
 * @param userId
 * @param url
 */
export async function enqueueListItemExternalIds(
  userId: number,
  url: string
): Promise<void> {
  const queryLimit = config.queueDeleteShareableListItems.queryLimit;
  let queryOffset = 0;
  const sqsCommands: SendMessageBatchCommand[] = [];
  let sqsEntries: SendMessageBatchRequestEntry[] = [];

  // the below loop will eventually break when the database runs out of
  // records, but es lint doesn't know that.

  /* eslint no-constant-condition: "off" */
  while (true) {
    // find queryLimit number of list items for the given user and url
    // TODO: improve the efficiency of this query
    // https://getpocket.atlassian.net/browse/OSL-565
    const externalIds = await db.listItem.findMany({
      select: {
        externalId: true,
        url: true,
      },
      where: {
        url,
        list: {
          userId,
        },
      },
      skip: queryOffset,
      take: queryLimit,
    });

    // if no list items were found for the given user and url, we're done!
    if (!externalIds.length) {
      break;
    }

    // chunk the externalIds into small, artisinal batches
    const chunkedExternalIds = chunk(
      // pull externalIds out of objects
      externalIds.map((eId) => eId.externalId),
      config.queueDeleteShareableListItems.externalIdChunkSize
    );

    let nextChunk = chunkedExternalIds.next();

    while (!nextChunk.done) {
      // take the chunk of externalIds and put it into an sqs message
      sqsEntries.push(
        convertToSqsEntry({ userId, url, externalIds: nextChunk.value })
      );

      // if the number of sqs messages reaches our batch size, push them as a
      // single command and re-start capturing sqs messages
      if (sqsEntries.length === config.aws.sqs.batchSize) {
        sqsCommands.push(buildSqsCommand(sqsEntries));
        sqsEntries = [];
      }

      nextChunk = chunkedExternalIds.next();
    }

    // move the offset of the query for the next batch from the database
    queryOffset += queryLimit;
  }

  // make sure any lingering sqs messages get pushed to an sqs command batch
  if (sqsEntries.length) {
    sqsCommands.push(buildSqsCommand(sqsEntries));
  }

  // wait for all sqs commands to be sent
  await Promise.allSettled(
    sqsCommands.map((command) => {
      // Handle logging individual errors as the promises are resolved
      return sqs.send(command).catch((err) => {
        const failedDeleteListItemSqsError = new Error(
          `ShareableListItemQueueDelete: Error - Failed to enqueue externalIds for userId: ${userId}, url: ${url} (command=\n${JSON.stringify(
            command
          )})`
        );

        Sentry.addBreadcrumb(failedDeleteListItemSqsError);
        Sentry.captureException(failedDeleteListItemSqsError.message);

        serverLogger.error({
          error: failedDeleteListItemSqsError,
          message: failedDeleteListItemSqsError.message,
          data: err,
        });
      });
    })
  );
}

router.post(
  '/',
  checkSchema(queueDeleteShareableListItemDataSchema),
  validate,
  async (req: Request, res: Response) => {
    const userId = req.body.userId;
    const url = req.body.url;

    await enqueueListItemExternalIds(userId, url);

    return res.send({
      status: 'OK',
      message: `ShareableListItemQueueDelete: Enqueued externalIds for userId: ${req.body.userId}, url: ${url}`,
    });
  }
);

export default router;
