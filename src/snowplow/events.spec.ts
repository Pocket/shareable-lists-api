import sinon from 'sinon';
import { expect } from 'chai';
import * as Sentry from '@sentry/node';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { ListStatus, ModerationStatus } from '@prisma/client';
import { ShareableListComplete, ShareableListItem } from '../database/types';
import {
  generateShareableListEventBridgePayload,
  generateShareableListItemEventBridgePayload,
  sendEvent,
  sendEventHelper,
} from './events';
import { EventBridgeEventType } from './types';
import { faker } from '@faker-js/faker';

describe('Snowplow event helpers', () => {
  let eventBridgeClientStub: sinon.SinonStub;
  let sentryStub;
  let crumbStub;
  let consoleSpy;

  const shareableList: ShareableListComplete = {
    externalId: faker.datatype.uuid(),
    userId: BigInt(12345),
    slug: null,
    title: 'Fake Random Title',
    description: faker.lorem.sentences(2),
    status: ListStatus.PRIVATE,
    moderationStatus: ModerationStatus.VISIBLE,
    moderatedBy: null,
    moderationReason: null,
    createdAt: new Date('2023-01-01 10:10:10'),
    updatedAt: new Date('2023-01-01 10:10:10'),
  };

  const shareableListItem: ShareableListItem = {
    // externalId: faker.datatype.uuid(),
    itemId: BigInt(98765),
    url: `${faker.internet.url()}/${faker.lorem.slug(5)}`,
    title: faker.random.words(5),
    excerpt: faker.lorem.sentences(2),
    imageUrl: faker.image.cats(),
    publisher: faker.company.name(),
    authors: `${faker.name.fullName()},${faker.name.fullName()}`,
    sortOrder: faker.datatype.number(),
    createdAt: new Date('2023-01-01 10:10:10'),
    updatedAt: new Date('2023-01-01 10:10:10'),
  };
  const shareableListItemExternalId = faker.datatype.uuid();

  beforeEach(() => {
    // we mock the send method on EventBridgeClient
    eventBridgeClientStub = sinon
      .stub(EventBridgeClient.prototype, 'send')
      .resolves({ FailedEntryCount: 0 });
    sentryStub = sinon.stub(Sentry, 'captureException').resolves();
    consoleSpy = sinon.spy(console, 'log');
    crumbStub = sinon.stub(Sentry, 'addBreadcrumb').resolves();
  });

  afterEach(() => {
    eventBridgeClientStub.restore();
    sentryStub.restore();
    consoleSpy.restore();
    crumbStub.restore();
  });

  it('generateShareableListEventBridgePayload function', async () => {
    // SHAREABLE_LIST_CREATED
    let payload = await generateShareableListEventBridgePayload(
      EventBridgeEventType.SHAREABLE_LIST_CREATED,
      shareableList
    );
    // shareableList obj must not be null
    expect(payload.shareableList).to.not.be.null;
    // check that the payload event type is for shareable-list-created
    expect(payload.eventType).to.equal(
      EventBridgeEventType.SHAREABLE_LIST_CREATED
    );
    // now check that API obj properties have been mapped to the Snowplow obj properties

    // externalId -> shareable_list_external_id
    expect(payload.shareableList.shareable_list_external_id).to.equal(
      shareableList.externalId
    );
    // moderationStatus -> moderation_status
    expect(payload.shareableList.moderation_status).to.equal(
      shareableList.moderationStatus
    );
    // moderatedBy -> moderated_by
    expect(payload.shareableList.moderated_by).to.equal(undefined);
    // moderationReason -> moderation_reason
    expect(payload.shareableList.moderation_reason).to.equal(undefined);
    // createdAt -> created_at in unix timestamp
    expect(payload.shareableList.created_at).to.equal(
      Math.floor(shareableList.createdAt.getTime() / 1000)
    );
    // updatedAt -> updated_at in unix timestamp
    expect(payload.shareableList.updated_at).to.equal(
      Math.floor(shareableList.updatedAt.getTime() / 1000)
    );

    // SHAREABLE_LIST_UPDATED
    // update some properties
    shareableList.title = 'Updated random title';
    shareableList.description = 'updated description';
    shareableList.updatedAt = new Date('2023-02-01 10:15:15');
    let newUpdatedAt = shareableList.updatedAt;
    payload = await generateShareableListEventBridgePayload(
      EventBridgeEventType.SHAREABLE_LIST_UPDATED,
      shareableList
    );
    // shareableList obj must not be null
    expect(payload.shareableList).to.not.be.null;
    // check that the payload event type is for shareable-list-updated
    expect(payload.eventType).to.equal(
      EventBridgeEventType.SHAREABLE_LIST_UPDATED
    );
    // check that title was updated
    expect(payload.shareableList.title).to.equal('Updated random title');
    // check that description was updated
    expect(payload.shareableList.description).to.equal('updated description');
    // updatedAt -> updated_at in seconds
    expect(payload.shareableList.updated_at).to.equal(
      Math.floor(newUpdatedAt.getTime() / 1000)
    );

    // SHAREABLE_LIST_PUBLISHED
    // update some properties
    shareableList.status = ListStatus.PUBLIC;
    shareableList.updatedAt = new Date('2023-02-01 10:15:45');
    newUpdatedAt = shareableList.updatedAt;
    payload = await generateShareableListEventBridgePayload(
      EventBridgeEventType.SHAREABLE_LIST_PUBLISHED,
      shareableList
    );
    // shareableList obj must not be null
    expect(payload.shareableList).to.not.be.null;
    // check that the payload event type is for shareable-list-published
    expect(payload.eventType).to.equal(
      EventBridgeEventType.SHAREABLE_LIST_PUBLISHED
    );
    // check that status was updated to PUBLIC
    expect(payload.shareableList.status).to.equal(ListStatus.PUBLIC);
    // updatedAt -> updated_at in seconds
    expect(payload.shareableList.updated_at).to.equal(
      Math.floor(newUpdatedAt.getTime() / 1000)
    );

    // SHAREABLE_LIST_UNPUBLISHED
    // update some properties
    shareableList.status = ListStatus.PRIVATE;
    shareableList.updatedAt = new Date('2023-02-02 10:15:07');
    newUpdatedAt = shareableList.updatedAt;
    payload = await generateShareableListEventBridgePayload(
      EventBridgeEventType.SHAREABLE_LIST_UNPUBLISHED,
      shareableList
    );
    // shareableList obj must not be null
    expect(payload.shareableList).to.not.be.null;
    // check that the payload event type is for shareable-list-unpublished
    expect(payload.eventType).to.equal(
      EventBridgeEventType.SHAREABLE_LIST_UNPUBLISHED
    );
    // check that status was updated to PUBLIC
    expect(payload.shareableList.status).to.equal(ListStatus.PRIVATE);
    // updatedAt -> updated_at in seconds
    expect(payload.shareableList.updated_at).to.equal(
      Math.floor(newUpdatedAt.getTime() / 1000)
    );

    // SHAREABLE_LIST_DELETED
    // simulate shareable-list-deleted event
    payload = await generateShareableListEventBridgePayload(
      EventBridgeEventType.SHAREABLE_LIST_DELETED,
      shareableList
    );
    // shareableList obj must not be null
    expect(payload.shareableList).to.not.be.null;
    // check that the payload event type is for shareable-list-deleted
    expect(payload.eventType).to.equal(
      EventBridgeEventType.SHAREABLE_LIST_DELETED
    );

    // SHAREABLE_LIST_HIDDEN
    // update some properties
    shareableList.moderationStatus = ModerationStatus.HIDDEN;
    shareableList.updatedAt = new Date('2023-02-03 05:15:43');
    newUpdatedAt = shareableList.updatedAt;
    payload = await generateShareableListEventBridgePayload(
      EventBridgeEventType.SHAREABLE_LIST_HIDDEN,
      shareableList
    );
    // shareableList obj must not be null
    expect(payload.shareableList).to.not.be.null;
    // check that the payload event type is for shareable-list-unpublished
    expect(payload.eventType).to.equal(
      EventBridgeEventType.SHAREABLE_LIST_HIDDEN
    );
    // check that moderation_status was updated to HIDDEN
    expect(payload.shareableList.moderation_status).to.equal(
      ModerationStatus.HIDDEN
    );
    // updatedAt -> updated_at in seconds
    expect(payload.shareableList.updated_at).to.equal(
      Math.floor(newUpdatedAt.getTime() / 1000)
    );
  });

  it('generateShareableListItemEventBridgePayload function', async () => {
    let payload = await generateShareableListItemEventBridgePayload(
      EventBridgeEventType.SHAREABLE_LIST_ITEM_CREATED,
      shareableListItem,
      shareableListItemExternalId,
      shareableList.externalId
    );
    // shareableListItem obj must not be null
    expect(payload.shareableListItem).to.not.be.null;
    // check that the payload event type is for shareable-list-item-created
    expect(payload.eventType).to.equal(
      EventBridgeEventType.SHAREABLE_LIST_ITEM_CREATED
    );
    // now check that API obj properties have been mapped to the Snowplow obj properties

    // externalId -> shareable_list_item_external_id
    expect(payload.shareableListItem.shareable_list_item_external_id).to.equal(
      shareableListItemExternalId
    );
    // listId -> shareable_list_external_id
    expect(payload.shareableListItem.shareable_list_external_id).to.equal(
      shareableList.externalId
    );
    // url-> given_url
    expect(payload.shareableListItem.given_url).to.equal(shareableListItem.url);
    // imageUrl-> image_url
    expect(payload.shareableListItem.image_url).to.equal(
      shareableListItem.imageUrl
    );
    // authors string getting mapped to array of strings
    expect(JSON.stringify(payload.shareableListItem.authors)).to.equal(
      JSON.stringify(shareableListItem.authors.split(','))
    );
    // createdAt -> created_at in unix timestamp
    expect(payload.shareableListItem.created_at).to.equal(
      Math.floor(shareableListItem.createdAt.getTime() / 1000)
    );
    // updatedAt -> updated_at in unix timestamp
    expect(payload.shareableListItem.updated_at).to.equal(
      Math.floor(shareableListItem.updatedAt.getTime() / 1000)
    );

    // simulate shareable-list-item-deleted event
    payload = await generateShareableListItemEventBridgePayload(
      EventBridgeEventType.SHAREABLE_LIST_ITEM_DELETED,
      shareableListItem,
      shareableListItemExternalId,
      shareableList.externalId
    );
    // shareableList obj must not be null
    expect(payload.shareableListItem).to.not.be.null;
    // check that the payload event type is for shareable-list-item-deleted
    expect(payload.eventType).to.equal(
      EventBridgeEventType.SHAREABLE_LIST_ITEM_DELETED
    );
  });
  describe('sendEventHelper function', () => {
    it('should log error if send call throws error for shareable-list event', async () => {
      eventBridgeClientStub.restore();
      eventBridgeClientStub = sinon
        .stub(EventBridgeClient.prototype, 'send')
        .rejects(new Error('boo!'));

      // pass shareable-list event as example
      await sendEventHelper(EventBridgeEventType.SHAREABLE_LIST_CREATED, {
        shareableList,
        isShareableListEventType: true,
      });

      // Wait just a tad in case promise needs time to resolve
      await setTimeout(() => {
        // nothing to see here
      }, 100);
      expect(sentryStub.callCount).to.equal(1);
      expect(sentryStub.getCall(0).firstArg.message).to.contain('boo!');
      expect(crumbStub.callCount).to.equal(1);
      expect(crumbStub.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'shareable_list_created' to event bus`
      );
      expect(consoleSpy.callCount).to.equal(2);
      expect(consoleSpy.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'shareable_list_created' to event bus`
      );
    });
    it('should log error if send call throws error for shareable-list-item event', async () => {
      eventBridgeClientStub.restore();
      eventBridgeClientStub = sinon
        .stub(EventBridgeClient.prototype, 'send')
        .rejects(new Error('boo!'));

      await sendEventHelper(EventBridgeEventType.SHAREABLE_LIST_ITEM_CREATED, {
        shareableListItem,
        shareableListItemExternalId,
        listExternalId: shareableList.externalId,
        isShareableListItemEventType: true,
      });

      // Wait just a tad in case promise needs time to resolve
      await setTimeout(() => {
        // nothing to see here
      }, 100);
      expect(sentryStub.callCount).to.equal(1);
      expect(sentryStub.getCall(0).firstArg.message).to.contain('boo!');
      expect(crumbStub.callCount).to.equal(1);
      expect(crumbStub.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'shareable_list_item_created' to event bus`
      );
      expect(consoleSpy.callCount).to.equal(2);
      console.log(consoleSpy.getCall(0).firstArg.message);
      expect(consoleSpy.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'shareable_list_item_created' to event bus`
      );
    });
  });
  describe('sendEvent function', () => {
    it('should send shareable-list event to event bus with proper event data', async () => {
      // let's first generate a payload to send to the event bridge
      const payload = await generateShareableListEventBridgePayload(
        EventBridgeEventType.SHAREABLE_LIST_CREATED,
        shareableList
      );
      // shareableList obj must not be null
      expect(payload.shareableList).to.not.be.null;
      // send shareable-list event
      await sendEvent(payload, true, false);

      // // Wait just a tad in case promise needs time to resolve
      await setTimeout(() => {
        // nothing to see here
      }, 100);
      expect(sentryStub.callCount).to.equal(0);
      expect(consoleSpy.callCount).to.equal(0);
    });
    it('should send shareable-list-item event to event bus with proper event data', async () => {
      // let's first generate a payload to send to the event bridge
      const payload = await generateShareableListItemEventBridgePayload(
        EventBridgeEventType.SHAREABLE_LIST_ITEM_CREATED,
        shareableListItem,
        shareableListItemExternalId,
        shareableList.externalId
      );
      // shareableList obj must not be null
      expect(payload.shareableListItem).to.not.be.null;
      // send shareable-list event
      await sendEvent(payload, false, true);

      // // Wait just a tad in case promise needs time to resolve
      await setTimeout(() => {
        // nothing to see here
      }, 100);
      expect(sentryStub.callCount).to.equal(0);
      expect(consoleSpy.callCount).to.equal(0);
    });
    it('should log error if send call throws error for shareable-list event', async () => {
      eventBridgeClientStub.restore();
      eventBridgeClientStub = sinon
        .stub(EventBridgeClient.prototype, 'send')
        .resolves({ FailedEntryCount: 1 });

      // let's first generate a payload to send to the event bridge
      const payload = await generateShareableListEventBridgePayload(
        EventBridgeEventType.SHAREABLE_LIST_CREATED,
        shareableList
      );
      // shareableList obj must not be null
      expect(payload.shareableList).to.not.be.null;
      // send shareable-list event
      await sendEvent(payload, true, false);

      // // Wait just a tad in case promise needs time to resolve
      await setTimeout(() => {
        // nothing to see here
      }, 100);
      expect(sentryStub.callCount).to.equal(1);
      expect(sentryStub.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'shareable_list_created' to event bus`
      );
      expect(consoleSpy.callCount).to.equal(1);
      expect(consoleSpy.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'shareable_list_created' to event bus`
      );
    });
    it('should log error if send call throws error for shareable-list-item event', async () => {
      eventBridgeClientStub.restore();
      eventBridgeClientStub = sinon
        .stub(EventBridgeClient.prototype, 'send')
        .resolves({ FailedEntryCount: 1 });

      // let's first generate a payload to send to the event bridge
      const payload = await generateShareableListItemEventBridgePayload(
        EventBridgeEventType.SHAREABLE_LIST_ITEM_CREATED,
        shareableListItem,
        shareableListItemExternalId,
        shareableList.externalId
      );
      // shareableListItem obj must not be null
      expect(payload.shareableListItem).to.not.be.null;
      // send shareable-list-item event
      await sendEvent(payload, false, true);

      // // Wait just a tad in case promise needs time to resolve
      await setTimeout(() => {
        // nothing to see here
      }, 100);
      expect(sentryStub.callCount).to.equal(1);
      expect(sentryStub.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'shareable_list_item_created' to event bus`
      );
      expect(consoleSpy.callCount).to.equal(1);
      expect(consoleSpy.getCall(0).firstArg.message).to.contain(
        `Failed to send event 'shareable_list_item_created' to event bus`
      );
    });
  });
});
