import { ApolloServer } from '@apollo/server';
import { PilotUser, PrismaClient } from '@prisma/client';
import { print } from 'graphql';
import request from 'supertest';
import { IPublicContext } from '../../context';
import { startServer } from '../../../express';
import { client } from '../../../database/client';
import { clearDb, createPilotUserHelper } from '../../../test/helpers';
import { IS_PILOT_USER } from './sample-queries.gql';
import { expect } from 'chai';

describe('public queries: PilotUser', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;

  let pilotUser: PilotUser;

  beforeAll(async () => {
    // port 0 tells express to dynamically assign an available port
    ({
      app,
      publicServer: server,
      publicUrl: graphQLUrl,
    } = await startServer(0));

    db = client();

    // create a pilot user
    pilotUser = await createPilotUserHelper(db, {
      userId: 8009882300,
    });
  });

  afterAll(async () => {
    await clearDb(db);
    await db.$disconnect();
    await server.stop();
  });

  describe('isPilotUser query', () => {
    it('should return true if user is in the pilot', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set({
          // the id of the pilot user we created above
          userId: pilotUser.userId.toString(),
        })
        .send({
          query: print(IS_PILOT_USER),
        });

      expect(result.body.data.isPilotUser).to.be.true;
    });

    it('should return false if user is not in the pilot', async () => {
      const result = await request(app)
        .post(graphQLUrl)
        .set({
          // *not* the id of the pilot user we created above
          userId: '7732025862',
        })
        .send({
          query: print(IS_PILOT_USER),
        });

      expect(result.body.data.isPilotUser).to.be.false;
    });
  });
});
