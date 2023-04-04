import * as Sentry from '@sentry/node';

/**
 * Return a Number or Null (if not resolved).
 * Prisma returns a String when it retrieves the BigInt value stored in
 * the datastore (by appending a "n" char to the value).
 *
 * @param parent
 * @param args
 * @param context
 * @param info
 * @constructor
 */
export const PrismaBigIntResolver = (parent, args, context, info) => {
  return parseFieldToInt(parent[info.fieldName]);
};

export function parseFieldToInt(field: string): number | null {
  // as the schema now requires returning a value even when the db is missing the value
  // if !field, we should error to Sentry.
  if (!field) {
    Sentry.captureException('itemId cannot be null');
    return null;
  }
  const parsedField = parseInt(field);
  return isNaN(parsedField) ? null : parsedField;
}
