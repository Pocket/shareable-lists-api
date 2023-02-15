import { expect } from 'chai';
import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';
import { faker } from '@faker-js/faker';
import { client } from '../../../database/client';
import {
  List,
  ListStatus,
  ModerationStatus,
  PrismaClient,
} from '@prisma/client';
import {
  CreateShareableListInput,
  UpdateShareableListInput,
} from '../../../database/types';
import {
  CREATE_SHAREABLE_LIST,
  UPDATE_SHAREABLE_LIST,
} from './sample-mutations.gql';
import { clearDb, createShareableListHelper } from '../../../test/helpers';
import slugify from 'slugify';
import config from '../../../config';

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

    it('should create a new List', async () => {
      const title = faker.random.words(2);
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
      expect(result.body.data.createShareableList.title).to.equal(title);
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
      expect(result.body.errors[0].message).to.equal(
        `A list with the title "Katerina's List" already exists`
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
      expect(updatedList.slug).to.contain(
        slugify(updatedList.title, config.slugify)
      );

      // Does the slug have a dash and 10 digits at the end?
      expect(updatedList.slug).to.match(/-\d{10}$/);
    });

    it('should generate a slug from updated title if one is provided', async () => {
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
      expect(updatedList.slug).to.contain(slugify(data.title, config.slugify));

      // Does the slug have a dash and 10 digits at the end?
      expect(updatedList.slug).to.match(/-\d{10}$/);
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
  });
});
