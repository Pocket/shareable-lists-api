import { IPublicContext } from '../context';
import xss from 'xss';
import { ForbiddenError } from '@pocket-tools/apollo-utils';
import { ACCESS_DENIED_ERROR } from '../../shared/constants';

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

  const validatedUserId = validateUserId(userId);

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
export function validateUserId(userId: number | bigint): number | bigint {
  // We need this check for nearly every query and mutation on the public graph
  if (!userId) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }

  return userId;
}
