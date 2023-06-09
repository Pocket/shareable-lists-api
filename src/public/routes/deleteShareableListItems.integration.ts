import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import * as Sentry from '@sentry/node';
import { PrismaClient } from '@prisma/client';
import { startServer } from '../../express';
import { IPublicContext } from '../context';
import { client } from '../../database/client';
import {
  clearDb,
  createShareableListHelper,
  createShareableListItemHelper,
  mockRedisServer,
} from '../../test/helpers';
import { getShareableListItemUrlsForUser } from './';
import { batchDeleteAllListItemsForUser } from './deleteShareableListItems';

describe('/deleteShareableListItems express endpoint', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  let sentryStub;
  let list1;
  let list2;
  let list3;
  let listItem1;
  let listItem2;
  const endpoint = 'deleteShareableListItems';

  const headers = {
    userId: '8009882300',
  };

  const headers2 = {
    userId: '76543',
  };

  beforeAll(async () => {
    mockRedisServer();
    // port 0 tells express to dynamically assign an available port
    ({
      app,
      publicServer: server,
      publicUrl: graphQLUrl,
    } = await startServer(0));
    db = client();
  });

  afterAll(async () => {
    await db.$disconnect();
    await server.stop();
  });

  afterEach(() => {
    sentryStub.restore();
  });

  beforeEach(async () => {
    sentryStub = sinon.stub(Sentry, 'captureException').resolves();
    await clearDb(db);

    // Create a few Lists
    list1 = await createShareableListHelper(db, {
      userId: parseInt(headers.userId),
      title: 'Simon Le Bon List',
    });

    list2 = await createShareableListHelper(db, {
      userId: parseInt(headers.userId),
      title: 'Bon Voyage List',
    });

    // Create a List for user 2
    list3 = await createShareableListHelper(db, {
      userId: parseInt(headers2.userId),
      title: 'Rolling Stones List',
    });

    // then create ist items for each list
    // list 1
    listItem1 = await createShareableListItemHelper(db, {
      list: list1,
      url: 'https://divine-rose.com',
    });
    listItem2 = await createShareableListItemHelper(db, {
      list: list1,
      url: 'https://hangover-hotel.com',
    });
    // list 2
    await createShareableListItemHelper(db, {
      list: list2,
      url: 'https://floral-street.com',
    });
    await createShareableListItemHelper(db, {
      list: list2,
      url: 'https://hangover-hotel.com',
    });
    // list 3
    await createShareableListItemHelper(db, {
      list: list3,
      url: 'https://hangover-hotel.com',
    });
  });

  describe('should delete all shareable list items by url for userId', () => {
    it('should not delete any list items for userId with no data and should not return error', async () => {
      const result = await request(app)
        .post(graphQLUrl + endpoint)
        .set('Content-Type', 'application/json')
        .send({ userId: '12345', url: 'https://fake-url.com' });
      expect(result.body.status).to.equal('OK');
      expect(result.body.message).to.contain(
        `No shareable list items found for User ID: 12345`
      );
    });

    it('should fail deleteShareableListItemData schema validation if bad userId', async () => {
      const result = await request(app)
        .post(graphQLUrl + endpoint)
        .set('Content-Type', 'application/json')
        .send({ userId: 'abc-12345', url: 'https://fake-url.com' });
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].msg).to.equal('Must provide valid userId');
    });

    it('should fail deleteShareableListItemData schema validation if bad url', async () => {
      const result = await request(app)
        .post(graphQLUrl + endpoint)
        .set('Content-Type', 'application/json')
        .send({ userId: '12345', url: 34678 });
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].msg).to.equal('Must provide valid url');
    });

    it('should successfully deleteShareableListItems by url for a userId', async () => {
      // delete items for userId 8009882300
      // this user has 2 lists and each list contains 1 listItem with url https://hangover-hotel.com
      const result = await request(app)
        .post(graphQLUrl + endpoint)
        .set('Content-Type', 'application/json')
        .send({ userId: headers.userId, url: 'https://hangover-hotel.com' });
      expect(result.body.status).to.equal('OK');
      expect(result.body.message).to.contain(
        `Deleting shareable list items for User ID: ${headers.userId}`
      );
      // lets manually call getShareableListItemUrlsForUser to check there are no list items with https://hangover-hotel.com url for this user
      const urls = await getShareableListItemUrlsForUser(
        parseInt(headers.userId),
        'https://hangover-hotel.com',
        db
      );
      expect(urls.length).to.equal(0);
    });
  });

  describe('batchDeleteAllListItemsForUser', () => {
    it('should return count=0 for deleting 0 list items for user with no list items by url', async () => {
      // userId 76543 has one list (list3) with 1 item hangover-hotel.com
      // try to delete item divine-rose.com for this user
      const count = await batchDeleteAllListItemsForUser(
        parseInt(headers2.userId),
        listItem1.url
      );
      // there should be no list items with this url found for list 3
      expect(count).to.equal(0);
    });
    it('should return correct count of deleted list items for user with list items matching url', async () => {
      // userId 8009882300 has two lists (list1, list2) and 2 list items per list
      // delete list items by hangover-hotel.com (1 list item in each list with this url)
      const count = await batchDeleteAllListItemsForUser(
        parseInt(headers.userId),
        listItem2.url
      );
      // there should be 2 total list items deleted
      expect(count).to.equal(2);
    });
  });
});
