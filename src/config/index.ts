// Environment variables below are set in .aws/src/main.ts
export default {
  app: {
    environment: process.env.NODE_ENV || 'development',
    defaultMaxAge: 0,
  },
  aws: {
    endpoint:
      process.env.NODE_ENV != 'production' &&
      process.env.NODE_ENV != 'development'
        ? process.env.AWS_ENDPOINT || 'http://localstack:4566'
        : undefined,
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
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    sqs: {
      batchSize: 10,
      listItemsDeleteQueue: {
        url:
          process.env.SQS_BATCH_LIST_ITEM_DELETE_QUEUE_URL ||
          'http://localhost:4566/queue/ShareableListsApi-Local-Batch-Delete-Consumer-Queue',
      },
    },
  },
  queueDeleteShareableListItems: {
    queryLimit: 500,
    externalIdChunkSize: 25,
  },
  redis: {
    primaryEndpoint: process.env.REDIS_PRIMARY_ENDPOINT || 'redis',
    readerEndpoint: process.env.REDIS_READER_ENDPOINT || 'redis',
    port: process.env.REDIS_PORT ?? 6379,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
    environment: process.env.NODE_ENV || 'development',
  },
  slugify: {
    locale: 'en',
    lower: true,
    remove: /[*+~.()'"!:@]/g,
    strict: true,
  },
};
