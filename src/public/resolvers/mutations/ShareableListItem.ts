import { ShareableListItem } from '../../../database/types';
import { deleteShareableListItem as dbDeleteShareableListItem } from '../../../database/mutations';
import { IPublicContext } from '../../context';
import { executeMutation } from './utils';

/**
 * @param parent
 * @param data
 * @param context
 */
export async function deleteShareableListItem(
  parent,
  { externalId },
  context: IPublicContext
): Promise<ShareableListItem> {
  return await executeMutation<string, ShareableListItem>(
    context,
    externalId,
    dbDeleteShareableListItem
  );
}
