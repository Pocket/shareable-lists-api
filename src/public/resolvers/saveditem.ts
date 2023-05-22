import { ShareableListItem } from '../../database/types';

/**
 * Resolve shareable list item on the SavedItem entity
 * @param url
 * @param _
 * @param dataLoaders
 */
export async function shareableListItem(
  { url },
  _,
  { dataLoaders }
): Promise<ShareableListItem> {
  if (url) {
    return await dataLoaders.shareableListItemsByUrl.load(url);
  } else {
    return null;
  }
}
