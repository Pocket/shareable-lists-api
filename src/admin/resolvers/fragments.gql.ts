import { gql } from 'graphql-tag';
import { ShareableListItemAdminProps } from '../../shared/fragments.gql';

export const ShareableListCompleteProps = gql`
  fragment ShareableListCompleteProps on ShareableListComplete {
    externalId
    title
    description
    slug
    status
    moderationStatus
    createdAt
    updatedAt
    moderatedBy
    moderationReason
    moderationDetails
    restorationReason
    listItems {
      ...ShareableListItemAdminProps
    }
  }
  ${ShareableListItemAdminProps}
`;
