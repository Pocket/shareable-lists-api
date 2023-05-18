import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { ShareableListItem } from '../database/types';
import { sortShareableListItemsByGivenItemIds } from './shareableListItemLoader';

const itemIds = [];
const shareableListItemMaker = (itemId: string): ShareableListItem => {
  return {
    externalId: faker.datatype.uuid(),
    itemId: parseInt(itemId) as unknown as bigint,
    url: `${faker.internet.url()}/${faker.lorem.slug(5)}`,
    title: faker.random.words(5),
    excerpt: faker.lorem.sentences(2),
    note: faker.lorem.sentences(2),
    imageUrl: faker.image.cats(),
    publisher: faker.company.name(),
    authors: faker.name.fullName(),
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

describe('shareableListItemLoader', () => {
  describe('sortShareableListItemsByGivenItemIds', () => {
    it('should sort the shareable list items in the order of the given itemIds', () => {
      // itemIds
      const itemIds = [34, 12, 56, 78, 910];
      // make some shareable list items matching the itemIds, making sure they are in a
      // different order than the itemId array above
      const shareableListItems: ShareableListItem[] = [
        shareableListItemMaker('910n'),
        shareableListItemMaker('78n'),
        shareableListItemMaker('56n'),
        shareableListItemMaker('12n'),
        shareableListItemMaker('34n'),
      ];
      // they should now be sorted by the itemIds array
      const sorted = sortShareableListItemsByGivenItemIds(
        itemIds as unknown as bigint[],
        shareableListItems
      );

      for (let i = 0; i < itemIds.length; i++) {
        expect(sorted[i].itemId).to.equal(itemIds[i]);
      }
    });

    it('should return undefined in the place of itemId that was not found', () => {
      // make some shareable list items matching some of the itemIdsn(one missing), making sure they are in a
      // different order than the itemId array above
      const shareableListItems: ShareableListItem[] = [
        shareableListItemMaker('910n'),
        shareableListItemMaker('78n'),
        shareableListItemMaker('56n'),
        shareableListItemMaker('34n'),
      ];

      // they should now be sorted by the itemIds array
      const sorted = sortShareableListItemsByGivenItemIds(
        itemIds as unknown as bigint[],
        shareableListItems
      );

      // even though one itemId wasn't found the arrays should be of equal length
      expect(sorted.length).to.equal(itemIds.length);

      for (let i = 0; i < itemIds.length; i++) {
        if (itemIds[i] !== '12n') {
          expect(sorted[i].itemId).to.equal(itemIds[i]);
        } else {
          expect(sorted[i]).not.to.exist;
        }
      }
    });
  });
});
