import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';
import { ForbiddenError } from '@pocket-tools/apollo-utils';
import { ACCESS_DENIED_ERROR } from '../shared/constants';

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
      db: PrismaClient;
      request: any;
    }
  ) {}

  get db(): IPublicContext['db'] {
    return this.config.db;
  }

  get userId(): IPublicContext['userId'] {
    const userId = this.config.request.headers.userid;
    // We need this check for every query and mutation on the public graph
    if (!userId) {
      throw new ForbiddenError(ACCESS_DENIED_ERROR);
    }

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
    db: client(),
    request: req,
  });
}
