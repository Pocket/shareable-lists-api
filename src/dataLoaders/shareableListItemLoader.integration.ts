import { expect } from 'chai';
import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';
import { getShareableListItemsByItemIds } from './shareableListItemLoader';
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
let itemIds = [];
let itemIds2 = [];

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
    itemIds = [];
    for (let i = 0; i < makeItems; i++) {
      listItem = await createShareableListItemHelper(db, {
        list: list,
      });
      itemIds.push(parseInt(listItem.itemId as unknown as string));
    }

    // Create some list items for list 2 , user 2
    itemIds2 = [];
    for (let i = 0; i < makeItems; i++) {
      listItem2 = await createShareableListItemHelper(db, {
        list: list2,
      });
      itemIds2.push(parseInt(listItem2.itemId as unknown as string));
    }
  });
  describe('getShareableListItemsByItemIds', () => {
    it('should return array of shareable list items by itemIds', async () => {
      const listItems = await getShareableListItemsByItemIds(
        db,
        itemIds,
        parseInt(publicUser1Headers.userId)
      );
      for (let i = 0; i < itemIds.length; i++) {
        expect(parseInt(listItems[i].itemId as unknown as string)).to.equal(
          itemIds[i]
        );
      }
    });

    it('should return empty array if itemIds do not exist', async () => {
      const itemIds = [123, 543, 567];
      const listItems = await getShareableListItemsByItemIds(
        db,
        itemIds as unknown as bigint[],
        parseInt(publicUser1Headers.userId)
      );
      expect(listItems.length).to.equal(0);
    });

    it('should return only list items that are found', async () => {
      let listItems = await getShareableListItemsByItemIds(
        db,
        itemIds,
        parseInt(publicUser1Headers.userId)
      );
      for (let i = 0; i < itemIds.length; i++) {
        expect(parseInt(listItems[i].itemId as unknown as string)).to.equal(
          itemIds[i]
        );
      }
      // push another fake itemId
      itemIds.push(5210346);
      // request the array of list items again
      listItems = await getShareableListItemsByItemIds(
        db,
        itemIds,
        parseInt(publicUser1Headers.userId)
      );
      // lenghts should not match
      expect(listItems.length).not.to.equal(itemIds.length);
      // listItems length should be one less than itemIds length
      expect(listItems.length).to.equal(itemIds.length - 1);
    });

    it('should not return list item not belonging to current user', async () => {
      // lets request list items for user 1, but itemIds array contains
      // list item belonging to user 2
      const itemIdsArr = [itemIds[0], itemIds2[0]];
      const listItems = await getShareableListItemsByItemIds(
        db,
        itemIdsArr,
        parseInt(publicUser1Headers.userId)
      );

      // we expect to get back only one list item belonging to user 1
      // lenghts should not match
      expect(listItems.length).not.to.equal(itemIdsArr.length);
      expect(listItems.length).to.equal(1);
      expect(parseInt(listItems[0].itemId as unknown as string)).to.equal(
        itemIds[0]
      );
    });

    it('should return empty array if no userId', async () => {
      const listItems = await getShareableListItemsByItemIds(
        db,
        itemIds as unknown as bigint[],
        null
      );
      expect(listItems.length).to.equal(0);
    });
  });
});
