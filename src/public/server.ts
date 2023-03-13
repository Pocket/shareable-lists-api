import { ApolloServer, GraphQLRequestContext } from '@apollo/server';
import { Server } from 'http';
import { buildSubgraphSchema } from '@apollo/subgraph';
import {
  ElasticacheRedis,
  errorHandler,
  sentryPlugin,
} from '@pocket-tools/apollo-utils';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import {
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginInlineTraceDisabled,
  ApolloServerPluginUsageReportingDisabled,
} from '@apollo/server/plugin/disabled';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import responseCachePlugin from '@apollo/server-plugin-response-cache';

import { typeDefsPublic } from '../typeDefs';
import { resolvers } from './resolvers';
import { IPublicContext } from './context';
import config from '../config';

export function getPublicServer(
  httpServer: Server,
  cache: ElasticacheRedis
): ApolloServer<IPublicContext> {
  const defaultPlugins = [
    //Copied from Apollo docs, the sessionID signifies if we should separate out caches by user.
    responseCachePlugin({
      //https://www.apollographql.com/docs/apollo-server/performance/caching/#saving-full-responses-to-a-cache
      //The user id is added to the request header by the apollo gateway (client api)
      sessionId: async (
        requestContext: GraphQLRequestContext<IPublicContext>
      ) =>
        requestContext?.request?.http?.headers?.has('userId')
          ? requestContext?.request?.http?.headers?.get('userId')
          : null,
    }),
    sentryPlugin,
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ApolloServerPluginCacheControl({
      defaultMaxAge: config.app.defaultMaxAge,
    }),
  ];
  const prodPlugins = [
    ApolloServerPluginLandingPageDisabled(),
    ApolloServerPluginInlineTrace(),
  ];
  const nonProdPlugins = [
    ApolloServerPluginLandingPageGraphQLPlayground(),
    ApolloServerPluginInlineTraceDisabled(),
    // Usage reporting is enabled by default if you have APOLLO_KEY in your environment
    ApolloServerPluginUsageReportingDisabled(),
  ];

  const plugins =
    process.env.NODE_ENV === 'production'
      ? defaultPlugins.concat(prodPlugins)
      : defaultPlugins.concat(nonProdPlugins);

  return new ApolloServer<IPublicContext>({
    schema: buildSubgraphSchema([{ typeDefs: typeDefsPublic, resolvers }]),
    // Caches the queries that apollo clients can send via a hashed get request
    // This allows us to cache resolver decisions
    persistedQueries: {
      cache,
      ttl: 300, // 5 minutes
    },
    plugins,
    cache,
    formatError: errorHandler,
  });
}

export async function startPublicServer(
  httpServer: Server,
  cache: ElasticacheRedis
): Promise<ApolloServer<IPublicContext>> {
  const server = getPublicServer(httpServer, cache);
  await server.start();
  return server;
}
