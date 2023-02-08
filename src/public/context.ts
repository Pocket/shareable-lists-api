import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';

/**
 * Context components specifically for the public graph.
 */

export interface IPublicContext {
  db: PrismaClient;
}

export class PublicContextManager implements IPublicContext {
  constructor(
    private config: {
      db: PrismaClient;
    }
  ) {}

  get db(): IPublicContext['db'] {
    return this.config.db;
  }
}

/**
 * Context factory function. Creates a new context upon every request.
 * @param req server request
 *
 * @returns PublicContextManager
 */
export async function getPublicContext(): Promise<PublicContextManager> {
  return new PublicContextManager({
    db: client(),
  });
}
