import { IPublicContext } from '../../context';
import {
  CreateShareableListItemInput,
  ShareableListItem,
} from '../../../database/types';
import { createShareableListItem as dbCreateShareableListItem } from '../../../database/mutations/ShareableListItem';
import { executeMutation } from './executeMutation';

/**
 * @param parent
 * @param data
 * @param context
 */
export async function createShareableListItem(
  parent,
  { data },
  context: IPublicContext
): Promise<ShareableListItem> {
  return await executeMutation<CreateShareableListItemInput, ShareableListItem>(
    context,
    data,
    dbCreateShareableListItem
  );
}
