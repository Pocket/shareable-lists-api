import Keyv from 'keyv';
import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import { ErrorsAreMissesCache } from '@apollo/utils.keyvaluecache';
import config from '../config';

// const keyv = new Keyv(
//   `redis://${config.redis.primaryEndpoint}:${config.redis.port}`
// );
// export const cache = new KeyvAdapter(keyv);

export function getRedisCache() {
  const keyv = new Keyv(
    `redis://${config.redis.primaryEndpoint}:${config.redis.port}`
  ).on('error', function (message) {
    console.error(`Redis cache error: ${message}`);
  });
  const cache = new ErrorsAreMissesCache(
    new KeyvAdapter(
      new Keyv(`redis://${config.redis.primaryEndpoint}:${config.redis.port}`)
    )
  );
  return cache;
}
