import { ForbiddenError, UserInputError } from '@pocket-tools/apollo-utils';
import {
  ACCESS_DENIED_ERROR,
  MODERATION_REASON_REQUIRED_ERROR,
} from '../../../shared/constants';
import { ShareableListComplete } from '../../../database/types';
import { moderateShareableList as dbModerateShareableList } from '../../../database/mutations';
import { IAdminContext } from '../../context';

/**
 * Resolver for the admin 'removeShareableList' mutation.
 *
 * This mutation removes shareable lists from all user views.
 *
 * @param parent
 * @param data
 * @param context
 * @throws { ForbiddenError } if the user doesn't have moderation permissions
 * @throws { NotFoundError } if the list does not exist
 * @throws { UserInputError } if the moderationReason is empty
 */
export async function moderateShareableList(
  parent,
  { data },
  context: IAdminContext
): Promise<ShareableListComplete> {
  const { db, authenticatedUser } = context;
  if (!authenticatedUser.hasFullAccess) {
    throw new ForbiddenError(ACCESS_DENIED_ERROR);
  }
  data.moderatedBy = authenticatedUser.username;
  if (data.moderationDetails) {
    data.moderationDetails = data.moderationDetails.trim();
  }
  return await dbModerateShareableList(db, data);
}
