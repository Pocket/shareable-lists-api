import {
  PutEventsCommand,
  PutEventsCommandOutput,
} from '@aws-sdk/client-eventbridge';
import * as Sentry from '@sentry/node';
import config from '../config/';
import { eventBridgeClient } from '../aws/eventBridgeClient';
import { ShareableListComplete, ShareableListItem } from '../database/types';
import {
  EventBridgeEventType,
  EventBridgeEventOptions,
  SnowplowShareableList,
  SnowplowShareableListItem,
  ShareableListEventBusPayload,
  ShareableListItemEventBusPayload,
} from './types';

/**
 * This function takes in the API Shareable List object and transforms it into a Snowplow Shareable List object
 * @param shareableList
 */
async function transformAPIShareableListToSnowplowShareableList(
  shareableList: ShareableListComplete
): Promise<SnowplowShareableList> {
  return {
    shareable_list_external_id: shareableList.externalId,
    slug: shareableList.slug,
    title: shareableList.title,
    description: shareableList.description
      ? shareableList.description
      : undefined,
    status: shareableList.status,
    moderation_status: shareableList.moderationStatus,
    moderated_by: shareableList.moderatedBy
      ? shareableList.moderatedBy
      : undefined,
    moderation_reason: shareableList.moderationReason
      ? shareableList.moderationReason
      : undefined,
    created_at: shareableList.createdAt.getSeconds(),
    updated_at: shareableList.updatedAt
      ? shareableList.updatedAt.getSeconds()
      : undefined,
  };
}

/**
 * This function takes in the API Shareable List Item object and transforms it into a Snowplow Shareable List Item object
 * @param shareableListItem
 */
async function transformAPIShareableListItemToSnowplowShareableListItem(
  shareableListItem: ShareableListItem,
  externalId: string,
  listExternalId: string
): Promise<SnowplowShareableListItem> {
  return {
    shareable_list_item_external_id: externalId,
    shareable_list_external_id: listExternalId,
    given_url: shareableListItem.url,
    title: shareableListItem.title ? shareableListItem.title : undefined,
    excerpt: shareableListItem.excerpt ? shareableListItem.excerpt : undefined,
    image_url: shareableListItem.imageUrl
      ? shareableListItem.imageUrl
      : undefined,
    authors: shareableListItem.authors
      ? shareableListItem.authors.split(',')
      : undefined,
    publisher: shareableListItem.publisher
      ? shareableListItem.publisher
      : undefined,
    sort_order: shareableListItem.sortOrder,
    created_at: shareableListItem.createdAt.getSeconds(),
    updated_at: shareableListItem.updatedAt
      ? shareableListItem.updatedAt.getSeconds()
      : undefined,
  };
}

/**
 * This method sets up the payload to send to Event Bridge for shareable-list mutations
 *
 * @param eventType
 * @param shareableList
 */
async function generateShareableListEventBridgePayload(
  eventType: EventBridgeEventType,
  shareableList: ShareableListComplete
): Promise<ShareableListEventBusPayload> {
  return {
    shareableList: await transformAPIShareableListToSnowplowShareableList(
      shareableList
    ),
    eventType: eventType,
  };
}

/**
 * This method sets up the payload to send to Event Bridge for shareable-list-item mutations
 *
 * @param eventType
 * @param shareableListItem
 * @param externalId
 * @param listExternalId
 */
async function generateShareableListItemEventBridgePayload(
  eventType: EventBridgeEventType,
  shareableListItem: ShareableListItem,
  externalId: string,
  listExternalId: string
): Promise<ShareableListItemEventBusPayload> {
  return {
    shareableListItem:
      await transformAPIShareableListItemToSnowplowShareableListItem(
        shareableListItem,
        externalId,
        listExternalId
      ),
    eventType: eventType,
  };
}

/**
 * This method prepares the payload to send to the Event Bridge.
 *
 * @param eventType
 * @param options
 */
export async function sendEventHelper(
  eventType: EventBridgeEventType,
  options: EventBridgeEventOptions
) {
  let payload;

  if (options.shareableList) {
    payload = await generateShareableListEventBridgePayload(
      eventType,
      options.shareableList
    );
  }

  if (options.shareableListItem) {
    payload = await generateShareableListItemEventBridgePayload(
      eventType,
      options.shareableListItem,
      options.shareableListItemExternalId,
      options.listExternalId
    );
  }
  console.log('payload: ', payload);

  // Send payload to Event Bridge.
  try {
    await sendEvent(
      payload,
      options.isShareableListEventType,
      options.isShareableListItemEventType
    );
  } catch (error) {
    // In the unlikely event that the payload generator throws an error,
    // log to Sentry and Cloudwatch but don't halt program
    const failedEventError = new Error(
      `Failed to send event '${
        payload.eventType
      }' to event bus. Event Body:\n ${JSON.stringify(payload)}`
    );
    // Don't halt program, but capture the failure in Sentry and Cloudwatch
    Sentry.addBreadcrumb(failedEventError);
    Sentry.captureException(error);
    console.log(failedEventError);
    console.log(error);
  }
}

/**
 * Send event to Event Bus, pulling the event bus and the event source
 * from the config.
 * Will not throw errors if event fails; instead, log exception to Sentry
 * and add to Cloudwatch logs.
 *
 *
 * @param eventPayload the payload to send to event bus
 */
export async function sendEvent(
  eventPayload: any,
  isShareableListEventType: boolean,
  isShareableListItemEventType: boolean
) {
  let eventBridgeSource;
  if (isShareableListEventType) {
    eventBridgeSource = config.aws.eventBus.eventBridge.shareableList.source;
  }
  if (isShareableListItemEventType) {
    eventBridgeSource =
      config.aws.eventBus.eventBridge.shareableListItem.source;
  }
  const putEventCommand = new PutEventsCommand({
    Entries: [
      {
        EventBusName: config.aws.eventBus.name,
        Detail: JSON.stringify(eventPayload),
        Source: eventBridgeSource,
        DetailType: eventPayload.eventType,
      },
    ],
  });

  console.log('putEventCommand: ', putEventCommand.input);

  const output: PutEventsCommandOutput = await eventBridgeClient.send(
    putEventCommand
  );

  console.log('output: ', output);

  if (output.FailedEntryCount) {
    const failedEventError = new Error(
      `Failed to send event '${
        eventPayload.eventType
      }' to event bus. Event Body:\n ${JSON.stringify(eventPayload)}`
    );

    // Don't halt program, but capture the failure in Sentry and Cloudwatch
    Sentry.captureException(failedEventError);
    console.log(failedEventError);
  }
}
