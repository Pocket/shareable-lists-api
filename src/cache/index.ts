import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import config from '../config';

const keyvRedis = new KeyvRedis(
  `${config.redis.primaryEndpoint.split(':')[0]}:${config.redis.port}`
);

const keyv = new Keyv({
  store: keyvRedis,
});

export const cache = new KeyvAdapter(keyv);

keyv.on('error', function (message) {
  console.error(`Redis cache error: ${message}`);
});
