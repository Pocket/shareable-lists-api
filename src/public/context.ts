import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';

/**
 * Context components specifically for the public graph.
 */

export interface IPublicContext {
  db: PrismaClient;
  // Pocket userId coming in from the http headers
  userId: string | Array<string>;
}

export class PublicContextManager implements IPublicContext {
  constructor(
    private config: {
      db: PrismaClient;
      request: any;
    }
  ) {}

  get db(): IPublicContext['db'] {
    return this.config.db;
  }

  get userId(): IPublicContext['userId'] {
    return this.config.request.headers.userid;
  }
}

/**
 * Context factory function. Creates a new context upon every request.
 * @param req server request
 *
 * @returns PublicContextManager
 */
export async function getPublicContext({
  req,
}: {
  req: Express.Request;
}): Promise<PublicContextManager> {
  return new PublicContextManager({
    db: client(),
    request: req,
  });
}
