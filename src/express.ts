import * as Sentry from '@sentry/node';
import express from 'express';
import http from 'http';
import cors from 'cors';
import xrayExpress from 'aws-xray-sdk-express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import config from './config';
import { startPublicServer } from './public/server';
import { getPublicContext, IPublicContext } from './public/context';
import { getAdminContext, IAdminContext } from './admin/context';
import { startAdminServer } from './admin/server';

/**
 * Initialize an express server.
 *
 * @param port number
 */
export async function startServer(port: number): Promise<{
  app: Express.Application;
  adminServer: ApolloServer<IAdminContext>;
  adminUrl: string;
  publicServer: ApolloServer<IPublicContext>;
  publicUrl: string;
}> {
  Sentry.init({
    ...config.sentry,
    debug: config.sentry.environment === 'development',
  });

  // initialize express with exposed httpServer so that it may be
  // provided to drain plugin for graceful shutdown.
  const app = express();
  const httpServer = http.createServer(app);

  // If there is no host header (really there always should be...) then use shareable-lists-api as the name
  app.use(xrayExpress.openSegment('shareable-lists-api'));

  // JSON parser to enable POST body with JSON
  app.use(express.json());

  // expose a health check url
  app.get('/.well-known/apollo/server-health', (req, res) => {
    res.status(200).send('ok');
  });

  // set up the admin server
  const adminServer = await startAdminServer(httpServer);
  const adminUrl = '/admin';

  app.use(
    adminUrl,
    cors<cors.CorsRequest>(),
    expressMiddleware<IAdminContext>(adminServer, {
      context: getAdminContext,
    })
  );

  // set up the public server
  const publicServer = await startPublicServer(httpServer);
  const publicUrl = '/';

  app.use(
    publicUrl,
    cors<cors.CorsRequest>(),
    expressMiddleware<IPublicContext>(publicServer, {
      context: getPublicContext,
    })
  );

  //Make sure the express app has the xray close segment handler
  app.use(xrayExpress.closeSegment());

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  return { app, adminServer, adminUrl, publicServer, publicUrl };
}
