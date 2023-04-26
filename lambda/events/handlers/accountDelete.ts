import { SQSRecord } from 'aws-lambda';
import { config } from '../config';
import fetch from 'node-fetch';

/**
 * Invoke the deleteUserData express endpoint in shareable-lists-api
 * to delete user data
 * @param record SQSRecord containing forwarded event from eventbridge
 * @throws Error if response is not ok
 */
export async function accountDeleteHandler(record: SQSRecord) {
  const message = JSON.parse(JSON.parse(record.body).Message)['detail'];
  const postBody = {
    userId: message['userId'],
  };
  const res = await fetch(config.apiEndpoint + config.deleteUserDataPath, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postBody),
  });
  if (!res.ok) {
    const data = (await res.json()) as any;
    throw new Error(
      `deleteUserData - ${res.status}\n${JSON.stringify(data.errors)}`
    );
  }
}
