import { expect } from 'chai';
import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import { List, ListItem, PrismaClient } from '@prisma/client';

import { IPublicContext } from '../../context';
import { startServer } from '../../../express';
import { client } from '../../../database/client';
import {
  clearDb,
  createShareableListHelper,
  createShareableListItemHelper,
  mockRedisServer,
} from '../../../test/helpers';
import { SHAREABLE_LIST_ITEM_ITEM_REFERENCE_RESOLVER } from './sample-queries.gql';

describe('ShareableListItem entities _representations query', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  let shareableList: List;
  let shareableListItem: ListItem;

  const publicUserHeaders = {
    userId: '987654321',
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

  beforeEach(async () => {
    await clearDb(db);

    // create a list to be used in tests
    shareableList = await createShareableListHelper(db, {
      userId: parseInt(publicUserHeaders.userId),
      title: 'This is a test list',
    });

    // create a list item for list
    shareableListItem = await createShareableListItemHelper(db, {
      list: shareableList,
    });
  });

  describe('Item reference resolver', () => {
    it('should resolve on a shareable list item Item', async () => {
      // the itemIds in db is stored as a bigInt, but query is expecting
      // a string itemId
      const itemId = parseInt(
        shareableListItem.itemId as unknown as string
      ).toString();

      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set(publicUserHeaders)
        .send({
          query: print(SHAREABLE_LIST_ITEM_ITEM_REFERENCE_RESOLVER),
          variables: {
            itemId: itemId,
          },
        });

      expect(result.body.errors).to.be.undefined;
      expect(result.body.data._entities.length).to.equal(1);
      expect(result.body.data._entities[0].itemId).to.equal(itemId);
      expect(result.body.data._entities[0].shareableListItem.url).to.equal(
        shareableListItem.url
      );
      expect(result.body.data._entities[0].shareableListItem.note).to.equal(
        shareableListItem.note
      );
      expect(
        result.body.data._entities[0].shareableListItem.externalId
      ).to.equal(shareableListItem.externalId);
      expect(
        result.body.data._entities[0].shareableListItem.sortOrder
      ).to.equal(shareableListItem.sortOrder);
    });

    it('should not resolve when an Item is not a shareable list item', async () => {
      const itemId = '9325';

      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set(publicUserHeaders)
        .send({
          query: print(SHAREABLE_LIST_ITEM_ITEM_REFERENCE_RESOLVER),
          variables: {
            itemId: itemId,
          },
        });

      expect(result.body.errors).to.be.undefined;
      expect(result.body.data._entities[0].shareableListItem).to.equal(null);
    });

    it('should not resolve when no userId', async () => {
      // the itemIds in db is stored as a bigInt, but query is expecting
      // a string itemId
      const itemId = parseInt(
        shareableListItem.itemId as unknown as string
      ).toString();

      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(SHAREABLE_LIST_ITEM_ITEM_REFERENCE_RESOLVER),
          variables: {
            itemId: itemId,
          },
        });

      expect(result.body.errors).to.be.undefined;
      expect(result.body.data._entities[0].shareableListItem).to.equal(null);
    });
  });
});
