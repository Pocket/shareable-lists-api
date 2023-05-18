import { expect } from 'chai';
import { ShareableListItem } from '../database/types';
import { sortShareableListItemsByGivenItemIds } from './shareableListItemLoader';
import { shareableListItemMaker } from '../test/helpers/shareableListItemMaker';

const itemIds = [34, 12, 6523, 78, 910];

describe('shareableListItemLoader', () => {
  describe('sortShareableListItemsByGivenItemIds', () => {
    it('should sort the shareable list items in the order of the given itemIds', () => {
      // make some shareable list items matching the itemIds, making sure they are in a
      // different order than the itemId array above
      const shareableListItems: ShareableListItem[] = [
        shareableListItemMaker('12n'),
        shareableListItemMaker('6523n'),
        shareableListItemMaker('910n'),
        shareableListItemMaker('78n'),
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
        shareableListItemMaker('6523n'),
        shareableListItemMaker('78n'),
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
        if (itemIds[i] !== 12) {
          expect(sorted[i].itemId).to.equal(itemIds[i]);
        } else {
          expect(sorted[i]).not.to.exist;
        }
      }
    });
  });
});
