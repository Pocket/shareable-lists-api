import { expect } from 'chai';
import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';
import { faker } from '@faker-js/faker';
import { client } from '../../../database/client';
import { ListStatus, ModerationStatus, PrismaClient } from '@prisma/client';
import { CreateShareableListInput } from '../../../database/types';
import { CREATE_SHAREABLE_LIST } from './sample-mutations.gql';
import { clearDb, createShareableListHelper } from '../../../test/helpers';

describe('public mutations: ShareableList', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  const headers = {
    userId: 'bobSinclair123',
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
        userId: headers.userId,
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
        userId: headers.userId,
        title: `Katerina's List`,
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
        userId: 'wassilyKandinsky',
        title: `Best Abstraction Art List`,
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
});
