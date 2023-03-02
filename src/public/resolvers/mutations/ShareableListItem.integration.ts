import { expect } from 'chai';
import sinon from 'sinon';
import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { List, ListItem, ModerationStatus, PrismaClient } from '@prisma/client';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';
import { client } from '../../../database/client';
import { CreateShareableListItemInput } from '../../../database/types';
import {
  CREATE_SHAREABLE_LIST_ITEM,
  DELETE_SHAREABLE_LIST_ITEM,
} from './sample-mutations.gql';
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
  let s3Stub: sinon.SinonStub;
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
    // we mock the send method on EventBridgeClient
    s3Stub = sinon
      .stub(EventBridgeClient.prototype, 'send')
      .resolves({ FailedEntryCount: 0 });
  });

  afterAll(async () => {
    s3Stub.restore();
    await db.$disconnect();
    await server.stop();
  });

  describe('createShareableListItem', () => {
    let list: List;

    beforeEach(async () => {
      await clearDb(db);

      // Create a parent Shareable List
      list = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'This List Will Have Lots of Stories',
      });
    });

    it("should not create a new item for a list that doesn't exist", async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: 'this-list-does-not-even-exist',
        itemId: 1,
        url: 'https://getpocket.com/discover',
        sortOrder: 1,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data.createShareableListItem).to.be.null;

      // And a "Not found" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'NOT_FOUND'
      );
    });

    it('should not create a new item for a list that has been taken down', async () => {
      const hiddenList = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'This List Has Been Removed',
        moderationStatus: ModerationStatus.HIDDEN,
      });

      const data: CreateShareableListItemInput = {
        listExternalId: hiddenList.externalId,
        itemId: 1,
        url: 'https://getpocket.com/discover',
        sortOrder: 5,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data.createShareableListItem).to.be.null;

      // And a "Not found" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'NOT_FOUND'
      );
    });

    it('should not create a list item in a list that belongs to another user', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: 1,
        url: 'https://www.test.com/this-is-a-story',
        title: 'This Story Is Trying to Sneak In',
        sortOrder: 20,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set({ userId: '222333444' }) // Note the test list is owned by user '12345'
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data.createShareableListItem).to.be.null;

      // And a "Not found" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'NOT_FOUND'
      );
    });

    it('should create a new list item', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: 3789538749,
        url: 'https://www.test.com/this-is-a-story',
        title: 'A story is a story',
        excerpt: 'The best story ever told',
        imageUrl: 'https://www.test.com/thumbnail.jpg',
        publisher: 'The London Times',
        authors: 'Charles Dickens, Mark Twain',
        sortOrder: 10,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.createShareableListItem).not.to.be.null;

      // Assert that all props are returned
      const listItem = result.body.data.createShareableListItem;
      expect(listItem.externalId).not.to.be.empty;
      expect(listItem.itemId).to.equal(3789538749);
      expect(listItem.url).to.equal(data.url);
      expect(listItem.title).to.equal(data.title);
      expect(listItem.excerpt).to.equal(data.excerpt);
      expect(listItem.imageUrl).to.equal(data.imageUrl);
      expect(listItem.publisher).to.equal(data.publisher);
      expect(listItem.authors).to.equal(data.authors);
      expect(listItem.sortOrder).to.equal(data.sortOrder);
      expect(listItem.createdAt).not.to.be.empty;
      expect(listItem.updatedAt).not.to.be.empty;
    });

    it('should not create a list item with the same URL in the same list', async () => {
      // Simulate a pre-existing item with the same URL by adding it straight
      // to the database
      await createShareableListItemHelper(db, {
        list,
        url: 'https://www.test.com/duplicate-url',
      });

      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: 1,
        url: 'https://www.test.com/duplicate-url',
        sortOrder: 5,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data.createShareableListItem).to.be.null;

      // And a "Bad user input" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'BAD_USER_INPUT'
      );
    });

    it('should create a list item with the same URL in a different list', async () => {
      // Create another list
      const list2 = await createShareableListHelper(db, {
        title: 'Another List By The Same User',
        userId: parseInt(headers.userId),
      });

      // Simulate a pre-existing item with the same URL by adding it straight
      // to the database
      await createShareableListItemHelper(db, {
        list: list2,
        url: 'https://www.test.com/duplicate-url',
      });

      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: 3789538749,
        url: 'https://www.test.com/another-duplicate-url',
        title: 'A story is a story',
        excerpt: 'The best story ever told',
        imageUrl: 'https://www.test.com/thumbnail.jpg',
        publisher: 'The Hogwarts Express',
        authors: 'Charles Dickens, Mark Twain',
        sortOrder: 5,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.createShareableListItem).not.to.be.null;

      // Assert that all props are returned
      const listItem = result.body.data.createShareableListItem;
      expect(listItem.externalId).not.to.be.empty;
      expect(listItem.itemId).to.equal(3789538749);
      expect(listItem.url).to.equal(data.url);
      expect(listItem.title).to.equal(data.title);
      expect(listItem.excerpt).to.equal(data.excerpt);
      expect(listItem.imageUrl).to.equal(data.imageUrl);
      expect(listItem.publisher).to.equal(data.publisher);
      expect(listItem.authors).to.equal(data.authors);
      expect(listItem.sortOrder).to.equal(data.sortOrder);
      expect(listItem.createdAt).not.to.be.empty;
      expect(listItem.updatedAt).not.to.be.empty;
    });
  });

  describe('deleteShareableListItem', () => {
    let shareableList: List;
    let listItem1: ListItem;

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
      // Run the mutation with a non-existing externalId
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
