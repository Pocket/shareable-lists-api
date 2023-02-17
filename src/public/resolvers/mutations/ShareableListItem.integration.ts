import { expect } from 'chai';
import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { List, ListItem, ModerationStatus, PrismaClient } from '@prisma/client';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';
import { client } from '../../../database/client';
import { DELETE_SHAREABLE_LIST_ITEM } from './sample-mutations.gql';
import {
  clearDb,
  createShareableListHelper,
  createShareableListItemHelper,
} from '../../../test/helpers';
import { ACCESS_DENIED_ERROR } from '../../../shared/constants';

describe('public mutations: ShareableListItem', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  let shareableList: List;
  let listItem1: ListItem;

  const headers = {
    userId: '12345',
  };

  beforeAll(async () => {
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
    // Create a VISIBLE List
    shareableList = await createShareableListHelper(db, {
      userId: parseInt(headers.userId),
      title: 'Simon Le Bon List',
    });
    // Create a ListItem
    listItem1 = await createShareableListItemHelper(db, {
      list: shareableList,
    });
  });

  describe('deleteShareableListItem', () => {
    it('should not delete a list item for another userId', async () => {
      // Create a List and ListItem for another userId
      const list = await createShareableListHelper(db, {
        userId: parseInt('65129'),
        title: 'Bob Sinclair List',
      });
      const listItem = await createShareableListItemHelper(db, {
        list,
      });
      // Run the mutation as userId: 12345 but trying to delete a list item for userId: 65129
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST_ITEM),
          variables: { externalId: listItem.externalId },
        });
      expect(result.body.data).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });

    it('should not delete a list item without userId in header', async () => {
      // Run the mutation with no userId in the header
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(DELETE_SHAREABLE_LIST_ITEM),
          variables: { externalId: listItem1.externalId },
        });
      expect(result.body.data).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });

    it('should not delete a list item if no list item was found', async () => {
      // Run the mutation with a non existing externalId
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST_ITEM),
          variables: { externalId: 'non-existing-uuid' },
        });
      expect(result.body.data).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
      expect(result.body.errors[0].message).to.equal(
        'Error - Not Found: A list item by that ID could not be found'
      );
    });

    it('should not delete a list item if parent list is hidden', async () => {
      // Create a HIDDEN List
      const hiddenShareableList = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'Simon Le Bon List',
        moderationStatus: ModerationStatus.HIDDEN,
      });
      // Create an item for the hidden list
      const listItem3 = await createShareableListItemHelper(db, {
        list: hiddenShareableList,
      });
      // Run the mutation
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST_ITEM),
          variables: { externalId: listItem3.externalId },
        });
      expect(result.body.data).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });

    it('should successfully delete a list item', async () => {
      // Run the mutation
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST_ITEM),
          variables: { externalId: listItem1.externalId },
        });
      expect(result.body.data.deleteShareableListItem).to.exist;
      expect(result.body.data.deleteShareableListItem.title).to.equal(
        listItem1.title
      );
      // Assert that the item is not present in the db anymore
      // by trying to delete the same item
      const result2 = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST_ITEM),
          variables: { externalId: listItem1.externalId },
        });
      expect(result2.body.data).not.to.exist;
      expect(result2.body.errors.length).to.equal(1);
      expect(result2.body.errors[0].extensions.code).to.equal('NOT_FOUND');
      expect(result2.body.errors[0].message).to.equal(
        'Error - Not Found: A list item by that ID could not be found'
      );
    });
  });
});
