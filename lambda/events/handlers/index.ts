import { SQSRecord } from 'aws-lambda';
import { accountDeleteHandler } from './accountDelete';
import { saveDeleteHandler } from './saveDelete';

// right hand value should map to the respective `detailType` in event bridge
export enum Event {
  ACCOUNT_DELETION = 'account-deletion',
  DELETE_ITEM = 'DELETE_ITEM',
}

// Mapping of detail-type (via event bridge message)
// to function that should be invoked to process the message
export const handlers: {
  [key: string]: (message: SQSRecord) => Promise<void>;
} = {
  [Event.ACCOUNT_DELETION]: accountDeleteHandler,
  [Event.DELETE_ITEM]: saveDeleteHandler,
};
