import { ApolloServer } from '@apollo/server';
import { Server } from 'http';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { errorHandler, sentryPlugin } from '@pocket-tools/apollo-utils';
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
import {
  createApollo4QueryValidationPlugin,
  constraintDirectiveTypeDefs,
} from 'graphql-constraint-directive/apollo4';
import { gql } from 'graphql-tag';

import { typeDefsPublic } from '../typeDefs';
import { resolvers } from './resolvers';
import { IPublicContext } from './context';
import config from '../config';
import { getRedisCache } from '../cache';

export function getPublicServer(
  httpServer: Server
): ApolloServer<IPublicContext> {
  const cache = getRedisCache();

  // Add @constraint directive to the schema
  const schema = buildSubgraphSchema([
    { typeDefs: gql(constraintDirectiveTypeDefs) },
    {
      typeDefs: typeDefsPublic,
      resolvers,
    },
  ]);

  const defaultPlugins = [
    responseCachePlugin(),
    sentryPlugin,
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ApolloServerPluginCacheControl({
      defaultMaxAge: config.app.defaultMaxAge,
    }),
    createApollo4QueryValidationPlugin({
      schema,
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
    schema,
    // Caches the queries that apollo clients can send via a hashed get request.
    // This allows us to cache resolver decisions and improve network performance
    // for large query strings
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
  httpServer: Server
): Promise<ApolloServer<IPublicContext>> {
  const server = getPublicServer(httpServer);
  await server.start();
  return server;
}
