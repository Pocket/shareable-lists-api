import { expect } from 'chai';
import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { List, ModerationStatus, PrismaClient } from '@prisma/client';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';
import { client } from '../../../database/client';
import { CreateShareableListItemInput } from '../../../database/types';
import { CREATE_SHAREABLE_LIST_ITEM } from './sample-mutations.gql';
import {
  clearDb,
  createShareableListHelper,
  createShareableListItemHelper,
} from '../../../test/helpers';

describe('public mutations: ShareableListItem', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  const headers = {
    userId: '12345',
  };

  let list: List;

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
    // Create a parent Shareable List
    list = await createShareableListHelper(db, {
      userId: parseInt(headers.userId),
      title: 'This List Will Have Lots of Stories',
    });
  });

  describe('createShareableListItem', () => {
    it("should not create a new item for a list that doesn't exist", async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: 'this-list-does-not-even-exist',
        url: 'https://getpocket.com/discover',
        sortOrder: 1,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data.createShareableListItem).to.be.null;

      // And a "Forbidden" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'FORBIDDEN'
      );
    });

    it('should not create a new item for a list that has been taken down', async () => {
      list.moderationStatus = ModerationStatus.HIDDEN;

      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        url: 'https://getpocket.com/discover',
        sortOrder: 5,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data.createShareableListItem).to.be.null;

      // And a "Forbidden" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'FORBIDDEN'
      );
    });

    it('should create a new list item', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        url: 'https://www.test.com/this-is-a-story',
        title: 'A story is a story',
        excerpt: 'The best story ever told',
        imageUrl: 'https://www.test.com/thumbnail.jpg',
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
      expect(listItem.url).to.equal(data.url);
      expect(listItem.title).to.equal(data.title);
      expect(listItem.excerpt).to.equal(data.excerpt);
      expect(listItem.imageUrl).to.equal(data.imageUrl);
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
        url: 'https://www.test.com/duplicate-url',
        sortOrder: 5,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data.createShareableListItem).to.be.null;

      // And a "Forbidden" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'FORBIDDEN'
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
        url: 'https://www.test.com/duplicate-url',
        sortOrder: 5,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // // A result should be returned
      // expect(result.body.data.createShareableListItem).not.to.be.null;
      //
      // // Assert that all props are returned
      // const listItem = result.body.data.createShareableListItem;
      // expect(listItem.externalId).not.to.be.empty;
      // expect(listItem.url).to.equal(data.url);
      // expect(listItem.title).to.equal(data.title);
      // expect(listItem.excerpt).to.equal(data.excerpt);
      // expect(listItem.imageUrl).to.equal(data.imageUrl);
      // expect(listItem.authors).to.equal(data.authors);
      // expect(listItem.sortOrder).to.equal(data.sortOrder);
      // expect(listItem.createdAt).not.to.be.empty;
      // expect(listItem.updatedAt).not.to.be.empty;
    });
  });
});
