import { expect } from 'chai';
import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';
import { getShareableListItemsByItemIds } from './shareableListItemLoader';
import {
  clearDb,
  createShareableListHelper,
  createShareableListItemHelper,
  createPilotUserHelper,
} from '../test/helpers';

let db: PrismaClient;
let list;
let listItem;
let itemIds = [];

// this user will be put into the pilot
const pilotUserHeaders = {
  userId: '8009882300',
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

    // create pilot users
    await createPilotUserHelper(db, {
      userId: parseInt(pilotUserHeaders.userId),
    });

    // Create a List
    list = await createShareableListHelper(db, {
      userId: parseInt(pilotUserHeaders.userId),
      title: 'Simon Le Bon List',
    });
    // Create some list items for that list
    // then create some list items
    const makeItems = Math.floor(Math.random() * 4) + 1;
    itemIds = [];
    for (let i = 0; i < makeItems; i++) {
      listItem = await createShareableListItemHelper(db, {
        list: list,
      });
      itemIds.push(parseInt(listItem.itemId as unknown as string));
    }
  });
  describe('getShareableListItemsByItemIds', () => {
    it('should return array of shareable list items by itemIds', async () => {
      const listItems = await getShareableListItemsByItemIds(db, itemIds);
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
        itemIds as unknown as bigint[]
      );
      expect(listItems.length).to.equal(0);
    });

    it('should return only list items that are found', async () => {
      let listItems = await getShareableListItemsByItemIds(db, itemIds);
      for (let i = 0; i < itemIds.length; i++) {
        expect(parseInt(listItems[i].itemId as unknown as string)).to.equal(
          itemIds[i]
        );
      }
      // push another fake itemId
      itemIds.push(5210346);
      // request the array of list items again
      listItems = await getShareableListItemsByItemIds(db, itemIds);
      // lenghts should not match
      expect(listItems.length).not.to.equal(itemIds.length);
      // listItems length should be one less than itemIds length
      expect(listItems.length).to.equal(itemIds.length - 1);
    });
  });
});
