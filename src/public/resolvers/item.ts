import { ShareableListItem } from '../../database/types';
import { validateItemId } from './utils';
import * as Sentry from '@sentry/node';

/**
 * Resolve shareable list item on the Item entity
 * @param itemId
 * @param _
 * @param dataLoaders
 */
export async function shareableListItem(
  { itemId },
  _,
  { dataLoaders }
): Promise<ShareableListItem> {
  try {
    if (itemId) {
      // make sure the itemId is valid
      // this is required as itemId must be a string at the API level, but is
      // actually a number in the db (legacy problems)
      validateItemId(itemId);
      return await dataLoaders.shareableListItemLoader.load(parseInt(itemId));
    } else {
      return null;
    }
  } catch (err) {
    console.log(err);
    Sentry.captureException(err);
    throw err;
  }
}
