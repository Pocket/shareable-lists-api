import { SQSRecord } from 'aws-lambda';
//import { config } from '../config';
//import isomorphicFetch from 'isomorphic-fetch';
//import fetchRetry from 'fetch-retry';

//const fetch = fetchRetry(isomorphicFetch);

/**
 * Invoke the deleteUserListItems express endpoint in shareable-lists-api
 * to delete all list items matching the deleted save's itemId
 * @param record SQSRecord containing forwarded event from eventbridge
 * @throws Error if response is not ok
 */
export async function saveDeleteHandler(record: SQSRecord) {
  const message = JSON.parse(JSON.parse(record.body).Message)['detail'];
  // logging for now to get concrete example of message body
  console.log('DELETE ITEM HANDLER');
  console.log(message);

  // TODO: send delete data to application endpoint
}
