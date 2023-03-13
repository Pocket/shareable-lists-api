import { ElasticacheRedis } from '@pocket-tools/apollo-utils';
import Redis from 'ioredis';
import config from '../config';

let redisCache = undefined;

export const getRedisCache = (): ElasticacheRedis => {
  if (redisCache) {
    return redisCache;
  }

  redisCache = new ElasticacheRedis(
    new Redis({
      port: 63779, // Redis port
      host: '127.0.0.1', // Redis host
    }),
    new Redis({
      port: 6379, // Redis port
      host: '127.0.0.1', // Redis host
    })
  );

  return redisCache;
};
