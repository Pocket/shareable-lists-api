/**
 * Return an object conforming to the Item graphql definition.
 *
 * @param parent // a ListItem
 * @param args
 * @param context
 * @param info
 */
export const ItemResolver = (parent, args, context, info) => {
  // very basic data transformation!
  return {
    givenUrl: parent.url,
  };
};
