import { ListStatus, ModerationStatus } from '@prisma/client';
import { ShareableListComplete, ShareableListItem } from '../database/types';

export type ShareableListEventBusPayload = {
  eventType: EventBridgeEventType;
  shareableList: SnowplowShareableList;
};

export type ShareableListItemEventBusPayload = {
  eventType: EventBridgeEventType;
  shareableListItem: SnowplowShareableListItem;
};

export enum EventBridgeEventType {
  SHAREABLE_LIST_CREATED = 'shareable-list-created',
  SHAREABLE_LIST_UPDATED = 'shareable-list-updated',
  SHAREABLE_LIST_DELETED = 'shareable-list-deleted',
  SHAREABLE_LIST_HIDDEN = 'shareable-list-hidden',
  SHAREABLE_LIST_PUBLISHED = 'shareable-list-published',
  SHAREABLE_LIST_UNPUBLISHED = 'shareable-list-unpublished',
  SHAREABLE_LIST_ITEM_CREATED = 'shareable-list-item-created',
  SHAREABLE_LIST_ITEM_DELETED = 'shareable-list-item-deleted',
}

export interface EventBridgeEventOptions {
  shareableList?: ShareableListComplete;
  shareableListItem?: ShareableListItem;
  shareableListItemExternalId?: string;
  listExternalId?: string;
  isShareableListEventType?: boolean;
  isShareableListItemEventType?: boolean;
}

/**
 * This ShareableList type maps to the shareable_list entity defined in Snowplow
 */
export type SnowplowShareableList = {
  shareable_list_external_id: string;
  slug: string;
  title: string;
  description?: string;
  status: ListStatus;
  moderation_status: ModerationStatus;
  moderated_by?: string;
  moderation_reason?: string;
  created_at: number; // snowplow schema requires this field in seconds
  updated_at?: number; // snowplow schema requires this field in seconds
};

/**
 * This ShareableListItem type maps to the shareable_list_item entity defined in Snowplow
 */
export type SnowplowShareableListItem = {
  shareable_list_item_external_id: string;
  shareable_list_external_id: string;
  given_url: string;
  title?: string;
  excerpt?: string;
  image_url?: string;
  authors?: string[];
  publisher?: string;
  sort_order: number;
  created_at: number; // snowplow schema requires this field in seconds
  updated_at?: number; // snowplow schema requires this field in seconds
};
