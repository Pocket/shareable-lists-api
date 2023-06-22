import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { SQS } from '@aws-sdk/client-sqs';
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
import config from '../../config';
import { enqueueListItemExternalIds } from './queueDeleteShareableListItems';
import { serverLogger } from '../../express';

describe('/queueDeleteShareableListItems', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  let userLists = [];
  let userListItems = [];
  const endpoint = 'queueDeleteShareableListItems';

  let sentrySpy;
  let breadSpy;
  let loggerErrorSpy;
  let sqsSendMock;
  let queryLimit;
  let externalIdChunkSize;
  let sqsBatchSize;

  const userIds = ['8009882300', '76543'];

  const headers = {
    userId: userIds[0],
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

    sentrySpy = sinon.spy(Sentry, 'captureException');
    breadSpy = sinon.spy(Sentry, 'addBreadcrumb');
    loggerErrorSpy = sinon.spy(serverLogger, 'error');
  });

  afterAll(async () => {
    sentrySpy.restore();
    breadSpy.restore();
    loggerErrorSpy.restore();

    await db.$disconnect();
    await server.stop();
  });

  afterEach(() => {
    // reset config values that were possibly changed in tests below
    config.queueDeleteShareableListItems.queryLimit = queryLimit;
    config.queueDeleteShareableListItems.externalIdChunkSize =
      externalIdChunkSize;
    config.aws.sqs.batchSize = sqsBatchSize;
  });

  beforeEach(async () => {
    await clearDb(db);

    userLists = [];
    userListItems = [];

    let listItem;

    // create a bunch of lists and list items for each user
    for (const userId of userIds) {
      for (let i = 0; i < 10; i++) {
        const list = await createShareableListHelper(db, {
          userId: parseInt(userId),
          title: `user ${userId} list ${i}`,
        });

        userLists.push(list);

        for (let j = 0; j < 5; j++) {
          listItem = await createShareableListItemHelper(db, {
            list,
            url: `https://user${userId}.list${i}.listItem${j}`,
          });

          userListItems.push(listItem);
        }

        // for half the lists, create a common list item to test deletes across
        // multiple lists
        if (i % 2 === 0) {
          listItem = await createShareableListItemHelper(db, {
            list,
            url: `https://thisis.a.commonListItem`,
          });

          userListItems.push(listItem);
        }
      }
    }

    // store the original config values so we can reset them in `afterEach`
    // above
    queryLimit = config.queueDeleteShareableListItems.queryLimit;
    externalIdChunkSize =
      config.queueDeleteShareableListItems.externalIdChunkSize;
    sqsBatchSize = config.aws.sqs.batchSize;
  });

  describe('enqueueListItemExternalIds SQS success', () => {
    beforeAll(() => {
      sqsSendMock?.restore();
    });

    beforeEach(
      () => (sqsSendMock = sinon.stub(SQS.prototype, 'send').resolves())
    );

    afterEach(() => sqsSendMock?.restore());

    it('sends batches of messages to sqs', async () => {
      config.queueDeleteShareableListItems.queryLimit = 3;
      config.queueDeleteShareableListItems.externalIdChunkSize = 3;
      config.aws.sqs.batchSize = 1;

      const userId = parseInt(headers.userId);
      const url = `https://thisis.a.commonListItem`;

      await enqueueListItemExternalIds(userId, url);

      // 2 send calls should have been made to SQS
      expect(sqsSendMock.callCount).to.equal(2);

      // no exceptions
      expect(sentrySpy.callCount).to.equal(0);
      expect(loggerErrorSpy.callCount).to.equal(0);

      const firstMessage = JSON.parse(
        sqsSendMock.getCall(0).args[0].input.Entries[0].MessageBody
      );

      const secondMessage = JSON.parse(
        sqsSendMock.getCall(1).args[0].input.Entries[0].MessageBody
      );

      // validate sqs batch size
      // (5 of the user's lists have the item queued for deletion)
      expect(firstMessage.externalIds.length).to.equal(3);
      expect(secondMessage.externalIds.length).to.equal(2);

      // we can't know which order the items will be retrieved from the db, but
      // we can test all known items are processed

      // put all processed externalIds in an array and sort it
      const queuedExternalIds = []
        .concat(firstMessage.externalIds, secondMessage.externalIds)
        .sort();

      // find all the lists for the current user (for filtering below)
      const listIdsForUser = userLists.reduce((acc, list) => {
        if (parseInt(list.userId) === userId) {
          acc.push(list.id);
        }

        return acc;
      }, []);

      // filter out all the externalIds that *should* have been processed into
      // an array and sort it
      const expectedExternalIds = userListItems
        .reduce((acc, li) => {
          // any list item matching the userId and url above should have been
          // processed
          if (listIdsForUser.includes(li.listId) && li.url === url) {
            acc.push(li.externalId);
          }

          return acc;
        }, [])
        .sort();

      expect(queuedExternalIds).to.deep.equal(expectedExternalIds);
    });

    it('sends no batches for a user without any matching list items', async () => {
      config.queueDeleteShareableListItems.queryLimit = 3;
      config.queueDeleteShareableListItems.externalIdChunkSize = 3;
      config.aws.sqs.batchSize = 1;

      const userId = parseInt(headers.userId);
      const url = `https://no.ListItemMatch.here`;

      await enqueueListItemExternalIds(userId, url);

      // no calls made to sqs
      expect(sqsSendMock.callCount).to.equal(0);

      // no exceptions
      expect(sentrySpy.callCount).to.equal(0);
      expect(loggerErrorSpy.callCount).to.equal(0);
    });
  });

  describe('enqueueListItemExternalIds SQS failure', () => {
    beforeAll(() => {
      sqsSendMock?.restore();
    });

    beforeEach(() => {
      sqsSendMock = sinon
        .stub(SQS.prototype, 'send')
        .onFirstCall()
        .rejects(new Error('no queue for you'))
        .onSecondCall()
        .resolves();
    });

    afterEach(() => sqsSendMock.restore());

    it('reports errors to serverLogger & sentry when a batch fails, even if some succeed', async () => {
      config.queueDeleteShareableListItems.queryLimit = 3;
      config.queueDeleteShareableListItems.externalIdChunkSize = 3;
      config.aws.sqs.batchSize = 1;

      const userId = parseInt(headers.userId);
      const url = `https://thisis.a.commonListItem`;

      await enqueueListItemExternalIds(userId, url);

      // two calls made
      expect(sqsSendMock.callCount).to.equal(2);

      // one fails
      expect(sentrySpy.callCount).to.equal(1);
      expect(sentrySpy.firstCall.args[0]).to.contain(
        'ShareableListItemQueueDelete: Error - Failed to enqueue externalIds for userId'
      );

      expect(loggerErrorSpy.callCount).to.equal(1);
      expect(loggerErrorSpy.firstCall.args[0].message).to.contain(
        'ShareableListItemQueueDelete: Error - Failed to enqueue externalIds for userId'
      );
      expect(loggerErrorSpy.firstCall.args[0].data.message).to.equal(
        'no queue for you'
      );

      expect(breadSpy.callCount).to.equal(1);
      expect(breadSpy.firstCall.args[0].message)
        .to.contain('ShareableListItemQueueDelete: Error')
        .and.to.contain('externalIds');
    });
  });

  describe('endpoint', () => {
    it('should fail schema validation if bad userId', async () => {
      const result = await request(app)
        .post(graphQLUrl + endpoint)
        .set('Content-Type', 'application/json')
        .send({ userId: 'abc-12345', url: 'https://fake-url.com' });
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].msg).to.equal('Must provide valid userId');
    });

    it('should fail schema validation if bad url', async () => {
      const result = await request(app)
        .post(graphQLUrl + endpoint)
        .set('Content-Type', 'application/json')
        .send({ userId: '12345', url: 34678 });
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].msg).to.equal('Must provide valid url');
    });

    it('should successfully execute the endpoint', async () => {
      const url = `https://user${headers.userId}.commonListItem`;

      // queue delete items for userId 8009882300
      const result = await request(app)
        .post(graphQLUrl + endpoint)
        .set('Content-Type', 'application/json')
        .send({
          userId: headers.userId,
          url,
        });

      expect(result.body.status).to.equal('OK');
      expect(result.body.message).to.contain(
        `ShareableListItemQueueDelete: Enqueued externalIds for userId: ${headers.userId}, url: ${url}`
      );
    });
  });

  /*
  TODO: will be refactored/removed in https://getpocket.atlassian.net/browse/OSL-563
  describe('should delete all shareable list items by url for userId', () => {
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
  */
});
