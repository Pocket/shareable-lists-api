import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';
import Express from 'express';

/**
 * Context components specifically for the public graph.
 */

export interface IPublicContext {
  db: PrismaClient;
  // Pocket userId coming in from the http headers
  userId: number | bigint;
}

export class PublicContextManager implements IPublicContext {
  constructor(
    private config: {
      request: Express.Request;
      db: PrismaClient;
    }
  ) {}

  get db(): IPublicContext['db'] {
    return this.config.db;
  }

  get userId(): number | bigint {
    const userId = this.config.request.headers.userid;
    return userId instanceof Array ? parseInt(userId[0]) : parseInt(userId);
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
    request: req,
    db: client(),
  });
}
