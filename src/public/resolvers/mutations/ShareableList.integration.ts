import { expect } from 'chai';
import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import {
  List,
  ListStatus,
  ModerationStatus,
  PrismaClient,
} from '@prisma/client';
import { faker } from '@faker-js/faker';
import slugify from 'slugify';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';
import { client } from '../../../database/client';
import {
  CreateShareableListInput,
  UpdateShareableListInput,
} from '../../../database/types';
import {
  CREATE_SHAREABLE_LIST,
  DELETE_SHAREABLE_LIST,
  UPDATE_SHAREABLE_LIST,
} from './sample-mutations.gql';
import {
  clearDb,
  createShareableListHelper,
  createShareableListItemHelper,
} from '../../../test/helpers';
import config from '../../../config';
import {
  ACCESS_DENIED_ERROR,
  LIST_TITLE_MAX_CHARS,
  LIST_DESCRIPTION_MAX_CHARS,
} from '../../../shared/constants';

describe('public mutations: ShareableList', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

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
  });

  describe('createShareableList', () => {
    beforeAll(async () => {
      // Create a List
      await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'Simon Le Bon List',
      });
    });

    it('should not create a new List without userId in header', async () => {
      const title = faker.random.words(2);
      const data: CreateShareableListInput = {
        title: title,
        description: faker.lorem.sentences(2),
      };
      const result = await request(app)
        .post(graphQLUrl)
        .send({
          query: print(CREATE_SHAREABLE_LIST),
          variables: { data },
        });
      expect(result.body.data.createShareableList).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });

    it('should create a new List', async () => {
      const title = 'My list to share<script>alert("Hello World!")</script>';
      const data: CreateShareableListInput = {
        title: title,
        description: faker.lorem.sentences(2),
      };
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST),
          variables: { data },
        });
      expect(result.body.data).to.exist;
      expect(result.body.data.createShareableList.title).to.equal(
        'My list to share&lt;script&gt;alert("Hello World!")&lt;/script&gt;'
      );
      expect(result.body.data.createShareableList.status).to.equal(
        ListStatus.PRIVATE
      );
      expect(result.body.data.createShareableList.moderationStatus).to.equal(
        ModerationStatus.VISIBLE
      );
    });

    it('should not create List with existing title for the same userId', async () => {
      const list1 = await createShareableListHelper(db, {
        title: `Katerina's List`,
        userId: parseInt(headers.userId),
      });
      const title1 = list1.title;
      // create new List with title1 value for the same user
      const data: CreateShareableListInput = {
        title: title1,
        description: faker.lorem.sentences(2),
      };
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST),
          variables: { data },
        });
      expect(result.body.data.createShareableList).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('BAD_USER_INPUT');
      expect(result.body.errors[0].message).to.equal(
        `A list with the title "Katerina's List" already exists`
      );
    });

    it('should not create List with a title of more than 100 chars', async () => {
      const data: CreateShareableListInput = {
        title: faker.random.alpha(LIST_TITLE_MAX_CHARS + 1),
        description: faker.lorem.sentences(2),
      };
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST),
          variables: { data },
        });
      expect(result.body.data.createShareableList).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('BAD_USER_INPUT');
      expect(result.body.errors[0].message).to.equal(
        `List title must not be longer than 100 characters`
      );
    });

    it('should not create List with a description of more than 200 chars', async () => {
      const data: CreateShareableListInput = {
        title: `Katerina's List`,
        description: faker.random.alpha(LIST_DESCRIPTION_MAX_CHARS + 1),
      };
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST),
          variables: { data },
        });
      expect(result.body.data.createShareableList).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('BAD_USER_INPUT');
      expect(result.body.errors[0].message).to.equal(
        `List description must not be longer than 200 characters`
      );
    });

    it('should create List with existing title in db but for different userId', async () => {
      const list1 = await createShareableListHelper(db, {
        title: `Best Abstraction Art List`,
        userId: parseInt('8765'),
      });
      const title1 = list1.title;
      // create new List with title1 value for the same user
      const data: CreateShareableListInput = {
        title: title1,
        description: faker.lorem.sentences(2),
      };
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST),
          variables: { data },
        });
      expect(result.body.data.createShareableList).to.exist;
      expect(result.body.data.createShareableList.title).to.equal(title1);
      expect(result.body.data.createShareableList.status).to.equal(
        ListStatus.PRIVATE
      );
      expect(result.body.data.createShareableList.moderationStatus).to.equal(
        ModerationStatus.VISIBLE
      );
    });

    it('should create List with a missing description', async () => {
      // create new List with a missing description
      const data: CreateShareableListInput = {
        title: `List with missing description`,
      };
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(CREATE_SHAREABLE_LIST),
          variables: { data },
        });
      expect(result.body.data.createShareableList).to.exist;
      expect(result.body.data.createShareableList.title).to.equal(
        'List with missing description'
      );
      expect(result.body.data.createShareableList.description).to.equal(null);
      expect(result.body.data.createShareableList.status).to.equal(
        ListStatus.PRIVATE
      );
      expect(result.body.data.createShareableList.moderationStatus).to.equal(
        ModerationStatus.VISIBLE
      );
    });
  });

  describe('deleteShareableList', () => {
    it('must not delete a list not owned by the current user', async () => {
      const otherUserId = parseInt(headers.userId) + 1;
      const otherUserList = await createShareableListHelper(db, {
        title: `Someone else's list`,
        userId: otherUserId,
      });
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST),
          variables: { externalId: otherUserList.externalId },
        });
      expect(result.body.data).to.be.null;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
    });

    it('cannot delete a list that does not exist', async () => {
      const dummyId = '1234567-1234-1234-1234-123456789012';
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST),
          variables: { externalId: dummyId },
        });
      expect(result.body.data).to.be.null;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
    });

    it('will delete a list created by the current user', async () => {
      const theList = await createShareableListHelper(db, {
        title: `A list to be deleted`,
        userId: BigInt(headers.userId),
      });
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST),
          variables: { externalId: theList.externalId },
        });

      expect(result.body.errors).to.be.undefined;
      expect(result.body.data.deleteShareableList).to.exist;
      expect(result.body.data.deleteShareableList.externalId).to.equal(
        theList.externalId
      );
      expect(result.body.data.deleteShareableList.title).to.equal(
        theList.title
      );
    });
    it('will  clear all items from a list', async () => {
      // first make a list
      const theList = await createShareableListHelper(db, {
        title: `A list to be deleted`,
        userId: BigInt(headers.userId),
      });
      // then create some list items
      const makeItems = Math.floor(Math.random() * 4) + 1;
      for (let i = 0; i < makeItems; i++) {
        await createShareableListItemHelper(db, {
          list: theList,
        });
      }
      //make sure that that worked
      let itemCount = await db.listItem.count({
        where: { listId: theList.id },
      });
      expect(itemCount).to.equal(makeItems);
      // now clear the list and check the result
      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(DELETE_SHAREABLE_LIST),
          variables: { externalId: theList.externalId },
        });
      expect(result.body.errors).to.be.undefined;
      itemCount = await db.listItem.count({
        where: { listId: theList.id },
      });
      expect(itemCount).to.equal(0);
    });
  });

  describe('updateShareableList', () => {
    let listToUpdate: List;

    beforeEach(async () => {
      // Create a List
      listToUpdate = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'The Most Shareable List',
      });
    });

    it('should update a list and return all props', async () => {
      const data: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        title: 'This Will Be A Brand New Title',
        description: faker.lorem.sentences(2),
        status: ListStatus.PRIVATE,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Verify that all optional properties have been updated
      const updatedList = result.body.data.updateShareableList;
      expect(updatedList.title).to.equal(data.title);
      expect(updatedList.description).to.equal(data.description);
      expect(updatedList.status).to.equal(data.status);

      // Check that props that shouldn't have changed stayed the same
      expect(updatedList.slug).to.equal(listToUpdate.slug);
      expect(updatedList.moderationStatus).to.equal(
        listToUpdate.moderationStatus
      );
      expect(updatedList.createdAt).to.equal(
        listToUpdate.createdAt.toISOString()
      );
      expect(updatedList.listItems).to.have.lengthOf(0);
      expect(updatedList.userId).to.equal(parseInt(headers.userId));

      // The `updatedAt` timestamp should change
      expect(updatedList.updatedAt).not.to.equal(
        listToUpdate.updatedAt.toISOString()
      );
    });

    it('should return a "Not Found" error if no list exists', async () => {
      const data: UpdateShareableListInput = {
        externalId: 'this-will-never-be-found',
        title: 'This Will Never Get Into The Database',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data).to.be.null;

      // And a "Not found" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'NOT_FOUND'
      );
    });

    it('should reject the update if user already has a list with the same title', async () => {
      const anotherListProps = {
        userId: parseInt(headers.userId),
        title: 'A Very Popular Title',
      };
      await createShareableListHelper(db, anotherListProps);

      const data: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        title: anotherListProps.title,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data).to.be.null;

      // And a "Bad user input" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'BAD_USER_INPUT'
      );
    });

    it('should allow the update if the existing title is passed', async () => {
      const data: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        title: listToUpdate.title, // send the existing title
        description: 'my b i forgot the description last time',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // the title should remain unchanged
      expect(result.body.data.updateShareableList.title).to.equal(data.title);
    });

    it('should generate a slug if a list is being made public for the first time', async () => {
      const data: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        status: ListStatus.PUBLIC,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Verify that the updates have taken place
      const updatedList = result.body.data.updateShareableList;
      expect(updatedList.status).to.equal(ListStatus.PUBLIC);
      expect(updatedList.slug).not.to.be.empty;

      // Does the slug match the current title?
      expect(updatedList.slug).to.equal(
        slugify(updatedList.title, config.slugify)
      );
    });

    it('should generate a slug from updated title if one is provided and made public for the first time', async () => {
      const data: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        title: 'This Title is Different',
        status: ListStatus.PUBLIC,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Verify that the updates have taken place
      const updatedList = result.body.data.updateShareableList;
      expect(updatedList.status).to.equal(ListStatus.PUBLIC);
      expect(updatedList.slug).not.to.be.empty;

      // Does the slug match the updated title?
      expect(updatedList.slug).to.equal(slugify(data.title, config.slugify));
    });

    it('should append next consecutive number to generated slug for list made public for the first time if slug containing list title already exists for a single user', async () => {
      let dataList1: UpdateShareableListInput;
      // create list 1
      const firstList = await createShareableListHelper(db, {
        title: `Hangover Hotel`,
        userId: BigInt(headers.userId),
      });
      // make list 1 PUBLIC
      dataList1 = {
        externalId: firstList.externalId,
        status: ListStatus.PUBLIC,
      };

      let result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data: dataList1 },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Verify that the updates have taken place
      const updatedList = result.body.data.updateShareableList;
      expect(updatedList.status).to.equal(ListStatus.PUBLIC);
      expect(updatedList.slug).not.to.be.empty;

      // Does the slug match the list 1 title?
      expect(updatedList.slug).to.equal(
        slugify(firstList.title, config.slugify)
      );

      // Update list 1 title
      dataList1 = {
        externalId: firstList.externalId,
        title: 'Sugar and Sunshine',
      };

      result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data: dataList1 },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Verify that the updates have taken place
      const updatedList1a = result.body.data.updateShareableList;
      expect(updatedList1a.status).to.equal(ListStatus.PUBLIC);
      expect(updatedList1a.title).to.equal(dataList1.title);
      // We don't expect the slug to be updated. Tt should match the original generated slug (hangover-hotel).
      expect(updatedList1a.slug).to.equal(updatedList.slug);

      // Now create a new list 2 with List 1 original title (Hangover Hotel)
      const secondList = await createShareableListHelper(db, {
        title: `Hangover Hotel`,
        userId: BigInt(headers.userId),
      });
      // make list 2 PUBLIC
      const dataList2 = {
        externalId: secondList.externalId,
        status: ListStatus.PUBLIC,
      };

      result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data: dataList2 },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Verify that the updates have taken place
      const updatedList2 = result.body.data.updateShareableList;
      expect(updatedList2.status).to.equal(ListStatus.PUBLIC);
      expect(updatedList2.title).to.equal(secondList.title);
      // Expect the slug to equal hangover-hotel-2
      expect(updatedList2.slug).to.equal('hangover-hotel-2');
    });

    it('should generate two identical slugs but for two different users', async () => {
      // create list 1
      const firstList = await createShareableListHelper(db, {
        title: `Hangover Hotel`,
        userId: BigInt(headers.userId),
      });
      // make list 1 PUBLIC
      const dataList1 = {
        externalId: firstList.externalId,
        status: ListStatus.PUBLIC,
      };

      let result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data: dataList1 },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Verify that the updates have taken place
      const updatedList = result.body.data.updateShareableList;
      expect(updatedList.status).to.equal(ListStatus.PUBLIC);
      expect(updatedList.slug).not.to.be.empty;

      // Does the slug match the list 1 title (hangover-hotel)?
      expect(updatedList.slug).to.equal(
        slugify(firstList.title, config.slugify)
      );

      const headersUser2 = {
        userId: '98765',
      };
      const secondList = await createShareableListHelper(db, {
        title: `Hangover Hotel`,
        userId: BigInt(headersUser2.userId),
      });
      // make list 2 PUBLIC
      const dataList2 = {
        externalId: secondList.externalId,
        status: ListStatus.PUBLIC,
      };

      result = await request(app)
        .post(graphQLUrl)
        .set(headersUser2)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data: dataList2 },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Verify that the updates have taken place
      const updatedList2 = result.body.data.updateShareableList;
      expect(updatedList2.status).to.equal(ListStatus.PUBLIC);
      expect(updatedList2.title).to.equal(secondList.title);
      // Expect the slug to equal hangover-hotel
      expect(updatedList2.slug).to.equal(
        slugify(secondList.title, config.slugify)
      );
    });

    it('should not update the slug once set if any other updates are made', async () => {
      // Run through the steps to publish the list and update the slug
      const data: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        title: 'This Title Could Not Be More Different',
        status: ListStatus.PUBLIC,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableList).not.to.be.null;

      // Let's save the list in this updated state
      const listWithSlugSet = result.body.data.updateShareableList;

      // Now update the title, status, description and see if anything happens
      // to the slug
      const data2: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        title: 'Suddenly This List is Private Again',
        description: 'I really should have kept this to myself',
        status: ListStatus.PRIVATE,
      };

      const result2 = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data: data2 },
        });

      // There should be no errors
      expect(result2.body.errors).to.be.undefined;

      // A result should be returned
      expect(result2.body.data.updateShareableList).not.to.be.null;

      // Verify that the updates have taken place
      const updatedList = result2.body.data.updateShareableList;
      expect(updatedList.status).to.equal(ListStatus.PRIVATE);
      expect(updatedList.title).to.equal(data2.title);
      expect(updatedList.description).to.equal(data2.description);

      // Is the slug unchanged? It should be!
      expect(updatedList.slug).to.equal(listWithSlugSet.slug);
    });

    it('should not update List with a title of more than 100 chars', async () => {
      const data: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        title: faker.random.alpha(LIST_TITLE_MAX_CHARS + 1),
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data).to.be.null;

      // And a "Bad user input" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'BAD_USER_INPUT'
      );
      expect(result.body.errors[0].message).to.equal(
        `List title must not be longer than 100 characters`
      );
    });

    it('should not update List with a description of more than 200 chars', async () => {
      const data: UpdateShareableListInput = {
        externalId: listToUpdate.externalId,
        description: faker.random.alpha(LIST_DESCRIPTION_MAX_CHARS + 1),
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST),
          variables: { data },
        });

      // There should be nothing in results
      expect(result.body.data).to.be.null;

      // And a "Bad user input" error
      expect(result.body).to.have.nested.property(
        'errors[0].extensions.code',
        'BAD_USER_INPUT'
      );
      expect(result.body.errors[0].message).to.equal(
        `List description must not be longer than 200 characters`
      );
    });
  });
});
