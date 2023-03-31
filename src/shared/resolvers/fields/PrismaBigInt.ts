/**
 * Return a Number.
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

function parseFieldToInt(field: string) {
  // as the schema now requires returning a value even when the db is missing
  // an itemId, we need to return an empty string (and not null)
  // once we backfill, if !field, we should error to sentry.
  // https://getpocket.atlassian.net/browse/OSL-338
  if (!field) {
    return '';
  }
  const parsedField = parseInt(field);
  // same here - if the parsed value is NaN, fall back to an empty string
  return isNaN(parsedField) ? '' : parsedField;
}
