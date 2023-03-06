import { IPublicContext } from '../../context';
import {
  CreateShareableListItemInput,
  ShareableListItem,
} from '../../../database/types';
import {
  createShareableListItem as dbCreateShareableListItem,
  deleteShareableListItem as dbDeleteShareableListItem,
} from '../../../database/mutations';
import { executeMutation } from '../utils';

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
