import { ApolloServer } from '@apollo/server';
import { Server } from 'http';
import { buildSubgraphSchema } from '@apollo/subgraph';
import typeDefs from './typeDefs';
import { resolvers } from './resolvers';
import { errorHandler } from '@pocket-tools/apollo-utils';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import {
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginInlineTraceDisabled,
  ApolloServerPluginUsageReportingDisabled,
} from '@apollo/server/plugin/disabled';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';

export function getServer(httpServer: Server): ApolloServer {
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
    process.env.NODE_ENV === 'production' ? prodPlugins : nonProdPlugins;
  return new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs: typeDefs, resolvers: resolvers }]),
    plugins,
    formatError: errorHandler,
  });
}

export async function startApolloServer(
  httpServer: Server
): Promise<ApolloServer> {
  const server = getServer(httpServer);
  await server.start();
  return server;
}
