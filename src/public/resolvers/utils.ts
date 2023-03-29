import xss from 'xss';

import { PrismaClient } from '@prisma/client';
import { ForbiddenError, UserInputError } from '@pocket-tools/apollo-utils';

import { IPublicContext } from '../context';
import { ACCESS_DENIED_ERROR } from '../../shared/constants';
import { isPilotUser } from '../../database/queries';

/**
 * Executes a mutation, catches exceptions and records to sentry and console
 * @param context
 * @param data
 * @param callback
 */
export async function executeMutation<T, U>(
  context: IPublicContext,
  data: T,
  callback: (db, data: T, userId?: number | bigint) => Promise<U>
): Promise<U> {
  const { db, userId } = context;

  const validatedUserId = await validateUserId(db, userId);

  return await callback(db, sanitizeMutationInput(data), validatedUserId);
}

/**
 * Sanitizes mutation inputs.
 *
 * @param input
 */
export function sanitizeMutationInput<InputType>(input: InputType): InputType {
  // Either a mutation input object or a primitive type
  let sanitizedInput: any;

  if (typeof input === 'object') {
    sanitizedInput = {};

    Object.entries(input).forEach(([key, value]) => {
      // Only transform string values
      sanitizedInput[key] = typeof value === 'string' ? xss(value) : value;
    });
  } else {
    sanitizedInput = typeof input === 'string' ? xss(input) : input;
  }

  return sanitizedInput;
}

/**
 * Checks that the Pocket user ID is present.
 *
 * @param userId
 */
export async function validateUserId(
  db: PrismaClient,
  userId: number | bigint
): Promise<number | bigint> {
  // We need this check for nearly every query and mutation on the public graph
  if (!userId) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }

  const isInPilot = await isPilotUser(db, userId);

  if (isInPilot <= 0) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }

  return userId;
}

/**
 * throws an error if the string value of itemId is not numeric
 *
 * itemId values must be strings when coming in from clients due to legacy
 * issues, yet needs to be stored as a number to match the canonical item
 * database table.
 *
 * @param itemId string | undefined
 * @returns void
 */
export function validateItemId(itemId?: string) {
  if (!itemId) return;

  if (
    itemId &&
    (isNaN(itemId as unknown as number) || isNaN(parseInt(itemId)))
  ) {
    throw new UserInputError(`${itemId} is an invalid itemId`);
  }
}
