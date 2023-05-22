import { expect } from 'chai';
import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';
import { getShareableListItemsByUrls } from './shareableListItemLoader';
import {
  clearDb,
  createShareableListHelper,
  createShareableListItemHelper,
} from '../test/helpers';

let db: PrismaClient;
let list;
let listItem;
let list2;
let listItem2;
let urls1 = [];
let urls2 = [];

const publicUser1Headers = {
  userId: '987654321',
};
const publicUser2Headers = {
  userId: '120076231',
};

describe('shareableListItemLoader', () => {
  beforeAll(async () => {
    db = client();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await clearDb(db);

    // Create a List for user 1
    list = await createShareableListHelper(db, {
      userId: parseInt(publicUser1Headers.userId),
      title: 'Simon Le Bon List',
    });

    // Create a List for user 2
    list2 = await createShareableListHelper(db, {
      userId: parseInt(publicUser2Headers.userId),
      title: 'Things to do in Paris',
    });
    // Create some list items for list 1 , user 1
    const makeItems = Math.floor(Math.random() * 4) + 1;
    urls1 = [];
    for (let i = 0; i < makeItems; i++) {
      listItem = await createShareableListItemHelper(db, {
        list: list,
      });
      urls1.push(listItem.url);
    }

    // Create some list items for list 2 , user 2
    urls2 = [];
    for (let i = 0; i < makeItems; i++) {
      listItem2 = await createShareableListItemHelper(db, {
        list: list2,
      });
      urls2.push(listItem2.url);
    }
  });
  describe('getShareableListItemsByUrls', () => {
    it('should return array of shareable list items by urls', async () => {
      const listItems = await getShareableListItemsByUrls(
        db,
        urls1,
        parseInt(publicUser1Headers.userId)
      );
      for (let i = 0; i < urls1.length; i++) {
        expect(listItems[i].url).to.equal(urls1[i]);
      }
    });

    it('should return empty array if urls do not exist', async () => {
      const urls1 = ['fake-url1.com', 'fake-url2.com', 'fake-url3.com'];
      const listItems = await getShareableListItemsByUrls(
        db,
        urls1,
        parseInt(publicUser1Headers.userId)
      );
      expect(listItems.length).to.equal(0);
    });

    it('should return only list items that are found', async () => {
      let listItems = await getShareableListItemsByUrls(
        db,
        urls1,
        parseInt(publicUser1Headers.userId)
      );
      for (let i = 0; i < urls1.length; i++) {
        expect(listItems[i].url).to.equal(urls1[i]);
      }
      // push another fake url
      urls1.push('fake-url.com');
      // request the array of list items again
      listItems = await getShareableListItemsByUrls(
        db,
        urls1,
        parseInt(publicUser1Headers.userId)
      );
      // lenghts should not match
      expect(listItems.length).not.to.equal(urls1.length);
      // listItems length should be one less than urls1 length
      expect(listItems.length).to.equal(urls1.length - 1);
    });

    it('should not return list item not belonging to current user', async () => {
      // lets request list items for user 1, but urls array contains
      // list item belonging to user 2
      const urlsArr = [urls1[0], urls2[0]];
      const listItems = await getShareableListItemsByUrls(
        db,
        urlsArr,
        parseInt(publicUser1Headers.userId)
      );

      // we expect to get back only one list item belonging to user 1
      // lenghts should not match
      expect(listItems.length).not.to.equal(urlsArr.length);
      expect(listItems.length).to.equal(1);
      expect(listItems[0].url).to.equal(urls1[0]);
    });

    it('should return empty array if no userId', async () => {
      const listItems = await getShareableListItemsByUrls(db, urls1, null);
      expect(listItems.length).to.equal(0);
    });
  });
});
