import Keyv from 'keyv';
import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import config from '../config';

let cache = undefined;

export const getRedisCache = (): KeyvAdapter => {
  if (cache) {
    return cache;
  }

  const keyv = new Keyv(
    `redis://${config.redis.primaryEndpoint}:${config.redis.port}`
  );

  cache = new KeyvAdapter(keyv);

  return cache;
};
