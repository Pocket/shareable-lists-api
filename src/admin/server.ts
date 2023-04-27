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
import { IAdminContext } from './context';
import { schema } from './schema';
import { createApollo4QueryValidationPlugin } from 'graphql-constraint-directive/apollo4';

/**
 * Sets up and configures an ApolloServer for the application.
 * contextFactory function for creating the context with every request
 *
 * @returns ApolloServer
 */
export function getAdminServer(
  httpServer: Server
): ApolloServer<IAdminContext> {
  const defaultPlugins = [
    sentryPlugin,
    ApolloServerPluginDrainHttpServer({ httpServer }),
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

  return new ApolloServer<IAdminContext>({
    schema,
    plugins,
    // to do: update our apollo utils to leverage logger & add graphql-level request logging,
    // have sentry config there just pull from logged errors (instead of dupes)
    formatError: errorHandler,
  });
}

/**
 * Create and start the apollo server. Required to await server.start()
 * before applying middleware.
 */
export async function startAdminServer(
  httpServer: Server
): Promise<ApolloServer<IAdminContext>> {
  const server = getAdminServer(httpServer);
  await server.start();
  return server;
}
