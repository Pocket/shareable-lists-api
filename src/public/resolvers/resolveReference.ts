import { NotFoundError } from '@pocket-tools/apollo-utils';
import { validateItemId } from './utils';

export async function resolveShareableListItemParserItemReference(
  { itemId },
  { dataLoaders }
) {
  validateItemId(itemId);
  const shareableListItem = await dataLoaders.shareableListItemLoader.load(
    itemId
  );

  if (!shareableListItem) {
    throw new NotFoundError(itemId);
  }

  return shareableListItem;
}
