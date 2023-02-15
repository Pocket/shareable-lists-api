import {
  CreateShareableListInput,
  ShareableList,
  UpdateShareableListInput,
} from '../../../database/types';
import {
  createShareableList as dbCreateShareableList,
  updateShareableList as dbUpdateShareableList,
} from '../../../database/mutations';
import { IPublicContext } from '../../context';

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

  return await callback(db, data, userId);
}

/**
 * @param parent
 * @param data
 * @param context
 */
export async function createShareableList(
  parent,
  { data },
  context: IPublicContext
): Promise<ShareableList> {
  return await executeMutation<CreateShareableListInput, ShareableList>(
    context,
    data,
    dbCreateShareableList
  );
}

/**
 * The update list mutation. Handles everything, including toggling the list
 * between PRIVATE and PUBLIC.
 *
 * @param parent
 * @param data
 * @param context
 */
export async function updateShareableList(
  parent,
  { data },
  context: IPublicContext
): Promise<ShareableList> {
  return await executeMutation<UpdateShareableListInput, ShareableList>(
    context,
    data,
    dbUpdateShareableList
  );
}
