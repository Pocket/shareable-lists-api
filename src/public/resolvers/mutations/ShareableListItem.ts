import { IPublicContext } from '../../context';
import {
  CreateShareableListItemInput,
  ShareableListItem,
  UpdateShareableListItemInput,
} from '../../../database/types';
import {
  createShareableListItem as dbCreateShareableListItem,
  deleteShareableListItem as dbDeleteShareableListItem,
  updateShareableListItem as dbUpdateShareableListItem,
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
 * @param parent not used
 * @param data UpdateShareableListItemInput
 * @param context IPublicContext
 */
export async function updateShareableListItem(
  parent,
  { data },
  context: IPublicContext
): Promise<ShareableListItem> {
  return await executeMutation<UpdateShareableListItemInput, ShareableListItem>(
    context,
    data,
    dbUpdateShareableListItem
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
