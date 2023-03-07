import { expect } from 'chai';
import { print } from 'graphql';
import request from 'supertest';

import { ApolloServer } from '@apollo/server';
import {
  List,
  ListStatus,
  ModerationStatus,
  PilotUser,
  PrismaClient,
} from '@prisma/client';

import { IPublicContext } from '../../context';
import { startServer } from '../../../express';
import { client } from '../../../database/client';
import {
  clearDb,
  createPilotUserHelper,
  createShareableListHelper,
  createShareableListItemHelper,
} from '../../../test/helpers';
import {
  GET_SHAREABLE_LIST,
  GET_SHAREABLE_LIST_PUBLIC,
  GET_SHAREABLE_LISTS,
} from './sample-queries.gql';
import { ACCESS_DENIED_ERROR } from '../../../shared/constants';

describe('public queries: ShareableList', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  let shareableList: List;
  let shareableList2: List;
  let pilotUser1: PilotUser;
  let pilotUser2: PilotUser;

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

    pilotUser1 = await createPilotUserHelper(db, {
      userId: parseInt(headers.userId),
    });

    pilotUser2 = await createPilotUserHelper(db, {
      userId: 8009882300,
    });

    // create a list to be used in tests (no list items)
    shareableList = await createShareableListHelper(db, {
      userId: parseInt(headers.userId),
      title: 'This is a test list',
    });

    // create another list
    shareableList2 = await createShareableListHelper(db, {
      userId: parseInt(headers.userId),
      title: 'This is a second test list',
    });
  });

  describe('shareableList query', () => {
    it('should not return a list for a user not in the pilot', async () => {
      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set({
          userId: '848135',
        })
        .send({
          query: print(GET_SHAREABLE_LIST),
          variables: {
            externalId: shareableList.externalId,
          },
        });

      // There should be nothing in results
      expect(result.body.data.shareableList).to.be.null;

      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });
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
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
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
      expect(list.description).to.equal(shareableList.description);

      // Default status values
      expect(list.status).to.equal(ListStatus.PRIVATE);
      expect(list.moderationStatus).to.equal(ModerationStatus.VISIBLE);

      // Variable values that just need to be non-null - we know Prisma
      // returns them in a compatible format
      expect(list.createdAt).not.to.be.empty;
      expect(list.updatedAt).not.to.be.empty;
      expect(list.externalId).not.to.be.empty;

      // Empty slug - it's not generated on creation
      expect(list.slug).to.be.null;

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
        expect(listItem.publisher).not.to.be.empty;
        expect(listItem.authors).not.to.be.empty;
        expect(listItem.sortOrder).to.be.a('number');
        expect(listItem.createdAt).not.to.be.empty;
        expect(listItem.updatedAt).not.to.be.empty;
      });
    });
  });

  describe('shareableListPublic query', () => {
    it('should return a "Not Found" error if no list exists', async () => {
      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SHAREABLE_LIST_PUBLIC),
          variables: {
            externalId: '1234-abcd',
          },
        });

      // There should be nothing in results
      expect(result.body.data.shareableListPublic).to.be.null;

      // And a "Not found" error
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
    });

    it('should return a 403 error if list has been taken down', async () => {
      // First we need a list that has been taken down
      // create another list
      const list = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'This is a list that does not comply with our policies',
        slug: 'this-is-a-list-that-does-not-comply',
        status: ListStatus.PUBLIC,
        moderationStatus: ModerationStatus.HIDDEN,
      });

      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SHAREABLE_LIST_PUBLIC),
          variables: {
            externalId: list.externalId,
          },
        });

      // There should be nothing in results
      expect(result.body.data.shareableListPublic).to.be.null;

      // And a "Forbidden" error
      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });

    it('should return a list with all props if it is accessible', async () => {
      const newList = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'This is a list that does not comply with our policies',
        slug: 'this-is-a-list-that-does-not-comply',
        status: ListStatus.PUBLIC,
        moderationStatus: ModerationStatus.VISIBLE,
      });

      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SHAREABLE_LIST_PUBLIC),
          variables: {
            externalId: newList.externalId,
          },
        });

      // A result should be returned
      expect(result.body.data.shareableList).not.to.be.null;

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // Now onto verifying individual list props
      const list = result.body.data.shareableListPublic;
      // Values we know as we've assigned them manually
      expect(list.title).to.equal(newList.title);
      expect(list.description).to.equal(newList.description);

      // Default status values
      expect(list.status).to.equal(ListStatus.PUBLIC);
      expect(list.moderationStatus).to.equal(ModerationStatus.VISIBLE);

      // Variable values that just need to be non-null - we know Prisma
      // returns them in a compatible format
      expect(list.createdAt).not.to.be.empty;
      expect(list.updatedAt).not.to.be.empty;
      expect(list.externalId).not.to.be.empty;

      // Empty slug - it's not generated on creation
      expect(list.slug).to.not.be.empty;

      // Empty list items array
      expect(list.listItems).to.have.lengthOf(0);
    });

    it('should return a list with list items', async () => {
      const newList = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'This is a new list',
        slug: 'the-slug',
        status: ListStatus.PUBLIC,
        moderationStatus: ModerationStatus.VISIBLE,
      });

      // Create a couple of list items
      await createShareableListItemHelper(db, { list: newList });
      await createShareableListItemHelper(db, { list: newList });

      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(GET_SHAREABLE_LIST_PUBLIC),
          variables: {
            externalId: newList.externalId,
          },
        });

      // A result should be returned
      expect(result.body.data.shareableListPublic).not.to.be.null;

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // There should be two list items
      expect(result.body.data.shareableListPublic.listItems).to.have.lengthOf(
        2
      );

      // Let's run through the visible props of each item
      // to make sure they're all there
      result.body.data.shareableListPublic.listItems.forEach((listItem) => {
        expect(listItem.url).not.to.be.empty;
        expect(listItem.title).not.to.be.empty;
        expect(listItem.excerpt).not.to.be.empty;
        expect(listItem.imageUrl).not.to.be.empty;
        expect(listItem.publisher).not.to.be.empty;
        expect(listItem.authors).not.to.be.empty;
        expect(listItem.sortOrder).to.be.a('number');
        expect(listItem.createdAt).not.to.be.empty;
        expect(listItem.updatedAt).not.to.be.empty;
      });
    });
  });

  describe('shareableLists query', () => {
    it('should not return results for a user not in the pilot', async () => {
      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set({
          userId: '848135',
        })
        .send({
          query: print(GET_SHAREABLE_LISTS),
        });

      // The returned shareableLists array should be empty
      expect(result.body.data).to.be.null;

      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });
    it('should return an empty shareableLists array if no lists exist for a given userId', async () => {
      // set headers for userId which has no lists
      const testHeaders = { userId: pilotUser2.userId };
      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set(testHeaders)
        .send({
          query: print(GET_SHAREABLE_LISTS),
        });

      // The returned shareableLists array should be empty
      expect(result.body.data.shareableLists.length).to.equal(0);
    });

    it('should return an array of lists with all props if it exists for a given userId', async () => {
      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_SHAREABLE_LISTS),
        });

      // A result should be returned
      expect(result.body.data.shareableList).not.to.be.null;

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // Expect the array length to contain 2 lists
      expect(result.body.data.shareableLists.length).to.equal(2);
      // We also want to assert that the first list returned in the array is the most recently created
      const listArray = [shareableList2, shareableList];
      // Loop over both lists and check their values are as expected
      for (let i = 0; i < listArray.length; i++) {
        expect(result.body.data.shareableLists[i].title).to.equal(
          listArray[i].title
        );
        expect(result.body.data.shareableLists[i].slug).to.equal(
          listArray[i].slug
        );
        expect(result.body.data.shareableLists[i].description).to.equal(
          listArray[i].description
        );
        expect(result.body.data.shareableLists[i].status).to.equal(
          ListStatus.PRIVATE
        );
        expect(result.body.data.shareableLists[i].moderationStatus).to.equal(
          ModerationStatus.VISIBLE
        );
        expect(result.body.data.shareableLists[i].createdAt).not.to.be.empty;
        expect(result.body.data.shareableLists[i].updatedAt).not.to.be.empty;
        expect(result.body.data.shareableLists[i].externalId).not.to.be.empty;
        // Empty list items array
        expect(result.body.data.shareableLists[i].listItems).to.have.lengthOf(
          0
        );
      }
    });

    it('should return an array of lists with list items for a given userId', async () => {
      // Create a couple of list items for list1
      await createShareableListItemHelper(db, { list: shareableList });
      await createShareableListItemHelper(db, { list: shareableList });
      // Create a couple of list items for list2
      await createShareableListItemHelper(db, { list: shareableList2 });
      await createShareableListItemHelper(db, { list: shareableList2 });

      // Run the query we're testing
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(GET_SHAREABLE_LISTS),
        });

      // A result should be returned
      expect(result.body.data.shareableLists).not.to.be.null;

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // There should be two list items for the first List in the array
      expect(result.body.data.shareableLists[0].listItems).to.have.lengthOf(2);
      // There should be two list items for the second List in the array
      expect(result.body.data.shareableLists[1].listItems).to.have.lengthOf(2);

      // Let's double check the returned array is ordered correctly
      expect(result.body.data.shareableLists[0].title).to.equal(
        shareableList2.title
      );
      expect(result.body.data.shareableLists[1].title).to.equal(
        shareableList.title
      );

      // Let's run through the visible props of each item
      // to make sure they're all there for the first List
      result.body.data.shareableLists[0].listItems.forEach((listItem) => {
        expect(listItem.url).not.to.be.empty;
        expect(listItem.title).not.to.be.empty;
        expect(listItem.excerpt).not.to.be.empty;
        expect(listItem.imageUrl).not.to.be.empty;
        expect(listItem.publisher).not.to.be.empty;
        expect(listItem.authors).not.to.be.empty;
        expect(listItem.sortOrder).to.be.a('number');
        expect(listItem.createdAt).not.to.be.empty;
        expect(listItem.updatedAt).not.to.be.empty;
      });

      // Let's run through the visible props of each item
      // to make sure they're all there for the second List
      result.body.data.shareableLists[1].listItems.forEach((listItem) => {
        expect(listItem.url).not.to.be.empty;
        expect(listItem.title).not.to.be.empty;
        expect(listItem.excerpt).not.to.be.empty;
        expect(listItem.imageUrl).not.to.be.empty;
        expect(listItem.publisher).not.to.be.empty;
        expect(listItem.authors).not.to.be.empty;
        expect(listItem.sortOrder).to.be.a('number');
        expect(listItem.createdAt).not.to.be.empty;
        expect(listItem.updatedAt).not.to.be.empty;
      });
    });
  });
});
