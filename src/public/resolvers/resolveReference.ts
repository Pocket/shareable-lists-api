import { validateItemId } from './utils';

export async function resolveShareableListItemParserItemReference(
  { itemId },
  { dataLoaders }
) {
  validateItemId(itemId);
  const shareableListItem = await dataLoaders.shareableListItemLoader.load(
    parseInt(itemId)
  );

  return shareableListItem;
}
