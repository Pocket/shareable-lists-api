import { ShareableListItem } from '../../database/types';
import { validateItemId } from './utils';

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
  if (itemId) {
    // make sure the itemId is valid
    // this is required as itemId must be a string at the API level, but is
    // actually a number in the db (legacy problems)
    validateItemId(itemId);
    return await dataLoaders.shareableListItemsByItemId.load(parseInt(itemId));
  } else {
    return null;
  }
}
