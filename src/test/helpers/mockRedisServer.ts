/* eslint @typescript-eslint/no-var-requires: "off" */
import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import Keyv from 'keyv';
import config from '../../config';

/**
 * Mocks the ioredis Redis class which is running under the hood of Keyv
 */
export function mockRedisServer() {
  config.app.defaultMaxAge = 0;
  const redisCacheFile = require('../../cache');
  const keyv = new Keyv();
  const keyvAdapter = new KeyvAdapter(keyv);
  jest.spyOn(redisCacheFile, 'getRedisCache').mockReturnValue(keyvAdapter);
}
