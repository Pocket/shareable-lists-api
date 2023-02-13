import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';
import { AuthenticationError } from '@pocket-tools/apollo-utils';

/**
 * Context components specifically for the public graph.
 */

export interface IPublicContext {
  db: PrismaClient;
  userId: string;
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
    const userId = this.config.request.headers.userid;

    if (!userId) {
      throw new AuthenticationError(
        'You must be logged in to use this service'
      );
    }

    return userId instanceof Array ? userId[0] : userId;
  }
}

/**
 * Context factory function. Creates a new context upon every request.
 * @param req server request
 *
 * @returns PublicContextManager
 */
export async function getPublicContext({ req }): Promise<PublicContextManager> {
  return new PublicContextManager({
    db: client(),
    request: req,
  });
}
