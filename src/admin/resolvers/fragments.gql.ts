import { gql } from 'graphql-tag';
import { ShareableListItemPublicProps } from '../../shared/fragments.gql';

export const ShareableListCompleteProps = gql`
  fragment ShareableListCompleteProps on ShareableListComplete {
    externalId
    userId
    title
    description
    slug
    status
    moderationStatus
    createdAt
    updatedAt
    moderatedBy
    moderationReason
    listItems {
      ...ShareableListItemPublicProps
    }
  }
  ${ShareableListItemPublicProps}
`;
