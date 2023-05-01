import { expect } from 'chai';
import sinon from 'sinon';
import { faker } from '@faker-js/faker';
import { print } from 'graphql';
import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import {
  List,
  ListItem,
  ModerationStatus,
  PilotUser,
  PrismaClient,
} from '@prisma/client';
import { startServer } from '../../../express';
import { IPublicContext } from '../../context';
import { client } from '../../../database/client';
import {
  CreateShareableListItemInput,
  UpdateShareableListItemInput,
} from '../../../database/types';
import {
  CREATE_SHAREABLE_LIST_ITEM,
  UPDATE_SHAREABLE_LIST_ITEM,
  DELETE_SHAREABLE_LIST_ITEM,
} from './sample-mutations.gql';
import {
  clearDb,
  createPilotUserHelper,
  createShareableListHelper,
  createShareableListItemHelper,
  mockRedisServer,
} from '../../../test/helpers';
import {
  ACCESS_DENIED_ERROR,
  LIST_ITEM_NOTE_MAX_CHARS,
} from '../../../shared/constants';

describe('public mutations: ShareableListItem', () => {
  let app: Express.Application;
  let server: ApolloServer<IPublicContext>;
  let graphQLUrl: string;
  let db: PrismaClient;
  let eventBridgeClientStub: sinon.SinonStub;
  let pilotUser1: PilotUser;
  let pilotUser2: PilotUser;

  const headers = {
    userId: '8009882300',
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
    // we mock the send method on EventBridgeClient
    eventBridgeClientStub = sinon
      .stub(EventBridgeClient.prototype, 'send')
      .resolves({ FailedEntryCount: 0 });
  });

  afterAll(async () => {
    eventBridgeClientStub.restore();
    await db.$disconnect();
    await server.stop();
  });

  describe('createShareableListItem', () => {
    let list: List;

    beforeEach(async () => {
      await clearDb(db);

      // create pilot users
      pilotUser1 = await createPilotUserHelper(db, {
        userId: parseInt(headers.userId),
      });

      pilotUser2 = await createPilotUserHelper(db, {
        userId: 7732025862,
      });

      // Create a parent Shareable List
      list = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'This List Will Have Lots of Stories',
      });
    });

    it('should not create a new item for a user not in the pilot', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: 'this-list-does-not-even-exist',
        itemId: '1',
        url: 'https://getpocket.com/discover',
        sortOrder: 1,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set({
          userId: 848135,
        })
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      expect(result.body.data.createShareableListItem).to.be.null;

      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });

    it("should not create a new item for a list that doesn't exist", async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: 'this-list-does-not-even-exist',
        itemId: '1',
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
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
    });

    it('should not create a new item for a list that has been taken down', async () => {
      const hiddenList = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'This List Has Been Removed',
        moderationStatus: ModerationStatus.HIDDEN,
      });

      const data: CreateShareableListItemInput = {
        listExternalId: hiddenList.externalId,
        itemId: '1',
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
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
    });

    it('should not create a list item in a list that belongs to another user', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: '1',
        url: 'https://www.test.com/this-is-a-story',
        title: 'This Story Is Trying to Sneak In',
        sortOrder: 20,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set({ userId: pilotUser2.userId }) // Note the test list is owned by pilotUser1
        .send({
          query: print(CREATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });
      // This mutation should not be cached, expect headers.cache-control = no-store
      expect(result.headers['cache-control']).to.equal('no-store');
      // There should be nothing in results
      expect(result.body.data.createShareableListItem).to.be.null;

      // And a "Not found" error
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
    });

    it('should not create a new list item with an invalid itemId', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: '383asdf4701731',
        url: 'https://www.test.com/this-is-a-story',
        title: 'A story is a story',
        excerpt: '<blink>The best story ever told</blink>',
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

      // And a "Not found" error
      expect(result.body.errors[0].extensions.code).to.equal('BAD_USER_INPUT');
      expect(result.body.errors[0].message).to.equal(
        `${data.itemId} is an invalid itemId`
      );
    });

    it('should not create a new list item with note longer than 300 characters', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: '3834701731',
        url: 'https://www.test.com/this-is-a-story',
        title: 'A story is a story',
        excerpt: '<blink>The best story ever told</blink>',
        note: faker.random.alpha(LIST_ITEM_NOTE_MAX_CHARS + 1),
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

      expect(result.body.errors[0].extensions.code).to.equal('BAD_USER_INPUT');
      expect(result.body.errors[0].message).to.contain(
        `Must be no more than ${LIST_ITEM_NOTE_MAX_CHARS} characters in length`
      );
    });

    it('should create a new list item without a note', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: '3834701731',
        url: 'https://www.test.com/this-is-a-story',
        title: 'A story is a story',
        excerpt: '<blink>The best story ever told</blink>',
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
      expect(listItem.itemId).to.equal(data.itemId);
      expect(listItem.url).to.equal(data.url);
      expect(listItem.title).to.equal(data.title);
      expect(listItem.excerpt).to.equal(
        '&lt;blink&gt;The best story ever told&lt;/blink&gt;'
      );
      expect(listItem.note).to.be.null;
      expect(listItem.imageUrl).to.equal(data.imageUrl);
      expect(listItem.publisher).to.equal(data.publisher);
      expect(listItem.authors).to.equal(data.authors);
      expect(listItem.sortOrder).to.equal(data.sortOrder);
      expect(listItem.createdAt).not.to.be.empty;
      expect(listItem.updatedAt).not.to.be.empty;
    });

    it('should create a new list item with all properties', async () => {
      const data: CreateShareableListItemInput = {
        listExternalId: list.externalId,
        itemId: '3834701731',
        url: 'https://www.test.com/this-is-a-story',
        title: 'A story is a story',
        excerpt: '<blink>The best story ever told</blink>',
        note: '<div>here is what <strong>i</strong> think about this article...</div>',
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

      // This mutation should not be cached, expect headers.cache-control = no-store
      expect(result.headers['cache-control']).to.equal('no-store');

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.createShareableListItem).not.to.be.null;

      // Assert that all props are returned
      const listItem = result.body.data.createShareableListItem;

      expect(listItem.externalId).not.to.be.empty;
      expect(listItem.itemId).to.equal(data.itemId);
      expect(listItem.url).to.equal(data.url);
      expect(listItem.title).to.equal(data.title);
      expect(listItem.excerpt).to.equal(
        '&lt;blink&gt;The best story ever told&lt;/blink&gt;'
      );
      expect(listItem.note).to.equal(
        '&lt;div&gt;here is what &lt;strong&gt;i&lt;/strong&gt; think about this article...&lt;/div&gt;'
      );
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
        itemId: '1',
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
      expect(result.body.errors[0].extensions.code).to.equal('BAD_USER_INPUT');
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
        itemId: '3789538749',
        url: 'https://www.test.com/another-duplicate-url',
        title: 'A story is a story',
        excerpt: 'The best story ever told',
        note: 'here is what i think about this article...',
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
      // This mutation should not be cached, expect headers.cache-control = no-store
      expect(result.headers['cache-control']).to.equal('no-store');
      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.createShareableListItem).not.to.be.null;

      // Assert that all props are returned
      const listItem = result.body.data.createShareableListItem;
      expect(listItem.externalId).not.to.be.empty;
      expect(listItem.itemId).to.equal(data.itemId);
      expect(listItem.url).to.equal(data.url);
      expect(listItem.title).to.equal(data.title);
      expect(listItem.excerpt).to.equal(data.excerpt);
      expect(listItem.note).to.equal(data.note);
      expect(listItem.imageUrl).to.equal(data.imageUrl);
      expect(listItem.publisher).to.equal(data.publisher);
      expect(listItem.authors).to.equal(data.authors);
      expect(listItem.sortOrder).to.equal(data.sortOrder);
      expect(listItem.createdAt).not.to.be.empty;
      expect(listItem.updatedAt).not.to.be.empty;
    });
  });

  describe('updateShareableListItem', () => {
    let shareableList1: List;
    let shareableList2: List;
    let listItem1: ListItem;
    let listItem2: ListItem;

    let clock;
    // for strong checks on createdAt and updatedAt values
    const arbitraryTimestamp = 1664400000000;
    const oneDay = 86400000;

    beforeEach(async () => {
      await clearDb(db);

      // create pilot users
      pilotUser1 = await createPilotUserHelper(db, {
        userId: parseInt(headers.userId),
      });

      pilotUser2 = await createPilotUserHelper(db, {
        userId: 7732025862,
      });

      // Create a VISIBLE List for pilot user 1
      shareableList1 = await createShareableListHelper(db, {
        userId: parseInt(headers.userId),
        title: 'Simon Le Bon List',
      });

      // Create a ListItem
      listItem1 = await createShareableListItemHelper(db, {
        list: shareableList1,
      });

      // Create a VISIBLE List for pilot user 2
      shareableList2 = await createShareableListHelper(db, {
        userId: pilotUser2.userId,
        title: 'Aux Merveilleux de Fred',
      });

      // Create a ListItem
      listItem2 = await createShareableListItemHelper(db, {
        list: shareableList2,
      });
    });

    it('should update a shareable list item', async () => {
      const data: UpdateShareableListItemInput = {
        externalId: listItem1.externalId,
        note: '<strong>new</strong> note!',
        sortOrder: 3,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableListItem).not.to.be.null;

      const listItem = result.body.data.updateShareableListItem;

      // the properties should be updated
      expect(listItem.note).to.equal('&lt;strong&gt;new&lt;/strong&gt; note!');
      expect(listItem.sortOrder).to.equal(data.sortOrder);
    });

    it('should update the updatedAt value', async () => {
      // Create a ListItem (specifically here to verify timestamps)
      listItem1 = await createShareableListItemHelper(db, {
        list: shareableList1,
      });

      // stub the clock so we can directly check createdAt and updatedAt
      clock = sinon.useFakeTimers({
        now: arbitraryTimestamp,
        shouldAdvanceTime: false,
      });

      // advance the clock one day to mimic an update made a day after create
      clock.tick(oneDay);

      const data: UpdateShareableListItemInput = {
        externalId: listItem1.externalId,
        sortOrder: 3,
      };

      // do some kind of sleep

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      expect(
        Date.parse(result.body.data.updateShareableListItem.updatedAt)
      ).to.equal(arbitraryTimestamp + oneDay);

      clock.restore();
    });

    it('should not update a shareable list item with a note greater than 300 characters', async () => {
      const data: UpdateShareableListItemInput = {
        externalId: listItem1.externalId,
        note: faker.random.alpha(LIST_ITEM_NOTE_MAX_CHARS + 1),
        sortOrder: 3,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      expect(result.body.errors[0].extensions.code).to.equal('BAD_USER_INPUT');
      expect(result.body.errors[0].message).to.contain(
        `Must be no more than ${LIST_ITEM_NOTE_MAX_CHARS} characters in length`
      );
    });

    it('should not update a shareable list item for an invalid external id', async () => {
      // list item 2 does not belong to the default user in the headers
      const data: UpdateShareableListItemInput = {
        externalId: 'totallyInvalidId',
        note: 'test',
        sortOrder: 3,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
      expect(result.body.errors[0].message).to.contain(
        'Error - Not Found: A list item by that ID could not be found'
      );
    });

    it('should not update a shareable list item for a different user', async () => {
      // list item 2 does not belong to the default user in the headers
      const data: UpdateShareableListItemInput = {
        externalId: listItem2.externalId,
        note: 'test',
        sortOrder: 3,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
      expect(result.body.errors[0].message).to.contain(
        'Error - Not Found: A list item by that ID could not be found'
      );
    });

    it('should not update a list item for a non-pilot user', async () => {
      const data: UpdateShareableListItemInput = {
        externalId: listItem1.externalId,
        note: 'test',
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set({
          userId: '848135',
        })
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      expect(result.body.data).to.be.null;

      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });

    it('should update a shareable list item and delete a note', async () => {
      const data: UpdateShareableListItemInput = {
        externalId: listItem1.externalId,
        note: null,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableListItem).not.to.be.null;

      const listItem = result.body.data.updateShareableListItem;

      // note should be gone
      expect(listItem.note).to.be.null;

      // sort order should be unchanged
      expect(listItem.sortOrder).to.equal(listItem1.sortOrder);
    });

    it('should update a shareable list item sort order', async () => {
      const data: UpdateShareableListItemInput = {
        externalId: listItem1.externalId,
        sortOrder: 4,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableListItem).not.to.be.null;

      const listItem = result.body.data.updateShareableListItem;

      // sort order should be updated
      expect(listItem.sortOrder).to.equal(data.sortOrder);

      // note should be retained
      expect(listItem.note).to.equal(listItem1.note);
    });

    it('should disregard a sort order of null', async () => {
      const data: UpdateShareableListItemInput = {
        externalId: listItem1.externalId,
        sortOrder: null,
      };

      const result = await request(app)
        .post(graphQLUrl)
        .set(headers)
        .send({
          query: print(UPDATE_SHAREABLE_LIST_ITEM),
          variables: { data },
        });

      // There should be no errors
      expect(result.body.errors).to.be.undefined;

      // A result should be returned
      expect(result.body.data.updateShareableListItem).not.to.be.null;

      const listItem = result.body.data.updateShareableListItem;

      // sort order should be updated
      expect(listItem.sortOrder).to.equal(listItem1.sortOrder);
    });
  });

  describe('deleteShareableListItem', () => {
    let shareableList: List;
    let listItem1: ListItem;

    beforeEach(async () => {
      await clearDb(db);

      // create pilot users
      pilotUser1 = await createPilotUserHelper(db, {
        userId: parseInt(headers.userId),
      });

      pilotUser2 = await createPilotUserHelper(db, {
        userId: 7732025862,
      });

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

    it('should not delete a list item for a user not in the pilot', async () => {
      const list = await createShareableListHelper(db, {
        userId: pilotUser1.userId,
        title: 'Bob Sinclair List',
      });

      const listItem = await createShareableListItemHelper(db, {
        list,
      });

      const result = await request(app)
        .post(graphQLUrl)
        .set({
          userId: '848135',
        })
        .send({
          query: print(DELETE_SHAREABLE_LIST_ITEM),
          variables: { externalId: listItem.externalId },
        });
      expect(result.body.data).not.to.exist;
      expect(result.body.errors.length).to.equal(1);
      expect(result.body.errors[0].extensions.code).to.equal('FORBIDDEN');
      expect(result.body.errors[0].message).to.equal(ACCESS_DENIED_ERROR);
    });

    it('should not delete a list item for another userId', async () => {
      // Create a List and ListItem for another userId
      const list = await createShareableListHelper(db, {
        userId: pilotUser2.userId,
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
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
      expect(result.body.errors[0].message).to.equal(
        'Error - Not Found: A list item by that ID could not be found'
      );
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
      expect(result.body.errors[0].extensions.code).to.equal('NOT_FOUND');
      expect(result.body.errors[0].message).to.equal(
        'Error - Not Found: A list item by that ID could not be found'
      );
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
      // This mutation should not be cached, expect headers.cache-control = no-store
      expect(result.headers['cache-control']).to.equal('no-store');
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
