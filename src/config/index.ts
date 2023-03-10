// Environment variables below are set in .aws/src/main.ts
export default {
  app: {
    environment: process.env.NODE_ENV || 'development',
    defaultMaxAge: 86400,
  },
  aws: {
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    eventBus: {
      name:
        process.env.EVENT_BUS_NAME || 'PocketEventBridge-Dev-Shared-Event-Bus',
      eventBridge: {
        shareableList: {
          source: 'shareable-list-events',
        },
        shareableListItem: {
          source: 'shareable-list-item-events',
        },
      },
    },
  },
  // TODO: Update example cache configuration below if necessary.
  // redis: {
  //   primaryEndpoint: process.env.REDIS_PRIMARY_ENDPOINT || 'redis',
  //   readerEndpoint: process.env.REDIS_READER_ENDPOINT || 'redis',
  //   port: process.env.REDIS_PORT ?? 6379,
  // },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
    environment: process.env.NODE_ENV || 'development',
  },
  slugify: { lower: true, remove: /[*+~.()'"!:@]/g },
};
