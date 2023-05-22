import { expect } from 'chai';
import { ShareableListItem } from '../database/types';
import { sortShareableListItemsByGivenUrls } from './shareableListItemLoader';
import { shareableListItemMaker } from '../test/helpers/shareableListItemMaker';

const urls = [
  'https://hello-world.com',
  'https://the-swallow.com',
  'https://hangover-hotel.com',
  'https://burning-rose.com',
  'https://white-lotus.com',
];

describe('shareableListItemLoader', () => {
  describe('sortShareableListItemsByGivenUrls', () => {
    it('should sort the shareable list items in the order of the given urls', () => {
      // make some shareable list items matching the urls, making sure they are in a
      // different order than the url array above
      const shareableListItems: ShareableListItem[] = [
        shareableListItemMaker('https://burning-rose.com'),
        shareableListItemMaker('https://white-lotus.com'),
        shareableListItemMaker('https://hello-world.com'),
        shareableListItemMaker('https://hangover-hotel.com'),
        shareableListItemMaker('https://the-swallow.com'),
      ];
      // they should now be sorted by the urls array
      const sorted = sortShareableListItemsByGivenUrls(
        urls,
        shareableListItems
      );

      for (let i = 0; i < urls.length; i++) {
        expect(sorted[i].url).to.equal(urls[i]);
      }
    });

    it('should return undefined in the place of the url that was not found', () => {
      // make some shareable list items matching some of the urls(one missing), making sure they are in a
      // different order than the url array above
      const shareableListItems: ShareableListItem[] = [
        shareableListItemMaker('https://the-swallow.com'),
        shareableListItemMaker('https://burning-rose.com'),
        shareableListItemMaker('https://hello-world.com'),
        shareableListItemMaker('https://hangover-hotel.com'),
      ];

      // they should now be sorted by the urls array
      const sorted = sortShareableListItemsByGivenUrls(
        urls,
        shareableListItems
      );

      // even though one url wasn't found the arrays should be of equal length
      expect(sorted.length).to.equal(urls.length);

      for (let i = 0; i < urls.length; i++) {
        if (urls[i] !== 'https://white-lotus.com') {
          expect(sorted[i].url).to.equal(urls[i]);
        } else {
          expect(sorted[i]).not.to.exist;
        }
      }
    });
  });
});
