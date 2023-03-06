import { isPilotUser as dbIsPilotUser } from '../../../database/queries';
import { validateUserId } from '../utils';

/**
 * Resolver for the public 'isPilotUser` query.
 *
 * @param parent
 * @param _ // no input on this query
 * @param userId // in context
 * @param db // in context
 */
export async function isPilotUser(parent, _, { userId, db }): Promise<boolean> {
  return (await dbIsPilotUser(db, validateUserId(userId))) > 0 ? true : false;
}
