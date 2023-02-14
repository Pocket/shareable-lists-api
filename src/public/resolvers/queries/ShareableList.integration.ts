import { ApolloServer } from '@apollo/server';
import {
  List,
  ListStatus,
  ModerationStatus,
  PrismaClient,
} from '@prisma/client';
import { print } from 'graphql';
import request from 'supertest';
import { IPublicContext } from '../../context';
import { startServer } from '../../../express';
import { client } from '../../../database/client';
import {
  clearDb,
  createShareableListHelper,
  createShareableListItemHelper,
} from '../../../test/helpers';
import { GET_SHAREABLE_LIST } from './sample-queries.gql';
import { expect } from 'chai';

describe('public queries: ShareableList', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  let shareableList: List;

  const headers = {
    userId: '123456789',
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

    // create a list to be used in tests (no list items)
    shareableList = await createShareableListHelper(db, {
      userId: headers.userId,
      title: 'This is a test list',
      slug: 'this-is-a-test-list-89674523',
    });
  });

  describe('shareableList query', () => {
    it('should return a "Not Found" error if no list exists', async () => {
      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_SHAREABLE_LIST),
          variables: {
            externalId: 'this-will-not-be-found',
          },
        });

      // There should be nothing in results
      expect(result.body.data.shareableList).to.be.null;

      // And a "Not found" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'NOT_FOUND'
      );
    });

    it('should return a list with all props if it exists', async () => {
      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_SHAREABLE_LIST),
          variables: {
            externalId: shareableList.externalId,
          },
        });

      // A result should be returned
      expect(result.body.data.shareableList).not.to.be.null;

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // Now onto verifying individual list props
      const list = result.body.data.shareableList;

      // Values we know as we've assigned them manually
      expect(list.title).to.equal(shareableList.title);
      expect(list.slug).to.equal(shareableList.slug);
      expect(list.description).to.equal(shareableList.description);

      // Default status values
      expect(list.status).to.equal(ListStatus.PRIVATE);
      expect(list.moderationStatus).to.equal(ModerationStatus.VISIBLE);

      // Variable values that just need to be non-null - we know Prisma
      // returns them in a compatible format
      expect(list.createdAt).not.to.be.empty;
      expect(list.updatedAt).not.to.be.empty;
      expect(list.externalId).not.to.be.empty;

      // Empty list items array
      expect(list.listItems).to.have.lengthOf(0);
    });

    it('should return a list with list items', async () => {
      // Create a couple of list items
      await createShareableListItemHelper(db, { list: shareableList });
      await createShareableListItemHelper(db, { list: shareableList });

      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_SHAREABLE_LIST),
          variables: {
            externalId: shareableList.externalId,
          },
        });

      // A result should be returned
      expect(result.body.data.shareableList).not.to.be.null;

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // There should be two list items
      expect(result.body.data.shareableList.listItems).to.have.lengthOf(2);

      // Let's run through the visible props of each item
      // to make sure they're all there
      result.body.data.shareableList.listItems.forEach((listItem) => {
        expect(listItem.url).not.to.be.empty;
        expect(listItem.title).not.to.be.empty;
        expect(listItem.excerpt).not.to.be.empty;
        expect(listItem.imageUrl).not.to.be.empty;
        expect(listItem.authors).not.to.be.empty;
        expect(listItem.sortOrder).to.be.a('number');
        expect(listItem.createdAt).not.to.be.empty;
        expect(listItem.updatedAt).not.to.be.empty;
      });
    });
  });
});
