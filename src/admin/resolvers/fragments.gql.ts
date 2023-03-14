import { gql } from 'graphql-tag';

export const ShareableListModerationProps = gql`
  fragment ShareableListModerationProps on ShareableListModeration {
    moderatedBy
    moderationReason
  }
`;
