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
  createPilotUserHelper,
  createShareableListHelper,
  createShareableListItemHelper,
  mockRedisServer,
} from '../../test/helpers';

describe('/deleteUserData express endpoint', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  let sentryStub;

  const headers = {
    userId: '8009882300',
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

    // create pilot users
    await createPilotUserHelper(db, {
      userId: parseInt(headers.userId),
    });
  });

  describe('should delete all shareable list user data for userId', () => {
    beforeEach(async () => {
      // Create a few Lists
      const list1 = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'Simon Le Bon List',
      });

      const list2 = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'Bon Voyage List',
      });

      // then create some random # of list items for each list
      const makeItems = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < makeItems; i++) {
        await createShareableListItemHelper(db, {
          list: list1,
        });
        await createShareableListItemHelper(db, {
          list: list2,
        });
      }
    });

    it('should not delete any data for userId with no data and should not return error', async () => {
      const result = await request(app)
        .post(graphQLUrl + 'deleteUserData')
        .set('Content-Type', 'application/json')
        .send({ userId: '12345' });
      expect(result.body.status).to.equal('OK');
      expect(result.body.message).to.contain(
        `No shareable list data to delete for User ID: 12345`
      );
    });

    it('should fail deleteUserData schema validation if bad userId', async () => {
      const result = await request(app)
        .post(graphQLUrl + 'deleteUserData')
        .set('Content-Type', 'application/json')
        .send({ userId: 'abc-12345' });
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].msg).to.equal('Must provide valid userId');
    });

    it('should successfully deleteUserData for a userId', async () => {
      const result = await request(app)
        .post(graphQLUrl + 'deleteUserData')
        .set('Content-Type', 'application/json')
        .send({ userId: headers.userId });
      expect(result.body.status).to.equal('OK');
      expect(result.body.message).to.contain(
        `Deleting shareable lists data for User ID: ${headers.userId}`
      );
    });
  });
});
