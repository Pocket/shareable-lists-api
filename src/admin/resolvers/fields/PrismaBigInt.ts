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
  if (!field) {
    return null;
  }
  return parseInt(field);
}
