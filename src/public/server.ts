import { ApolloServer } from '@apollo/server';
import { Server } from 'http';
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
import { createApollo4QueryValidationPlugin } from 'graphql-constraint-directive/apollo4';

import { IPublicContext } from './context';
import config from '../config';
import { getRedisCache } from '../cache';
import { schema } from './schema';

export function getPublicServer(
  httpServer: Server
): ApolloServer<IPublicContext> {
  const cache = getRedisCache();

  const defaultPlugins = [
    // On initialization, this plugin automatically begins caching responses according to field settings
    // see shareableListPublic cache control settings
    responseCachePlugin(),
    sentryPlugin,
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ApolloServerPluginCacheControl({
      // Let's set the default max age to 0 so that no query responses get cached by default
      // and we will specify the max age for specific queries on the schema and resolver level
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
  const nonProdPlugins = [ApolloServerPluginLandingPageGraphQLPlayground()];
  const localPlugins = [
    ApolloServerPluginLandingPageGraphQLPlayground(),
    ApolloServerPluginInlineTraceDisabled(),
    ApolloServerPluginUsageReportingDisabled(),
  ];
  const plugins = [
    ...defaultPlugins,
    ...(process.env.NODE_ENV === 'production' ? prodPlugins : []),
    ...(process.env.NODE_ENV === 'development' ? nonProdPlugins : []),
    ...(process.env.NODE_ENV === 'local' ? localPlugins : []),
  ];

  return new ApolloServer<IPublicContext>({
    schema,
    plugins,
    cache,
    // to do: update our apollo utils to leverage logger & add graphql-level request logging,
    // have sentry config there just pull from logged errors (instead of dupes)
    formatError: errorHandler,
  });
}

/**
 * Create and start the apollo server. Required to await server.start()
 * before applying middleware.
 */
export async function startPublicServer(
  httpServer: Server
): Promise<ApolloServer<IPublicContext>> {
  const server = getPublicServer(httpServer);
  await server.start();
  return server;
}
