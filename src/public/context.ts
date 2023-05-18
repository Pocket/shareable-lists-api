import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';
import { shareableListItemLoader } from '../dataLoaders/shareableListItemLoader';

/**
 * Context components specifically for the public graph.
 */

export interface IPublicContext {
  db: PrismaClient;
  // Pocket userId coming in from the http headers
  userId: number | bigint;
  dataLoaders: {
    shareableListItemLoader: typeof shareableListItemLoader;
  };
}

export class PublicContextManager implements IPublicContext {
  constructor(
    private config: {
      db: PrismaClient;
      shareableListItemLoader: IPublicContext['dataLoaders']['shareableListItemLoader'];
      request: any;
    }
  ) {}

  get db(): IPublicContext['db'] {
    return this.config.db;
  }

  get userId(): IPublicContext['userId'] {
    const userId = this.config.request.headers.userid;

    return userId instanceof Array ? parseInt(userId[0]) : parseInt(userId);
  }

  get dataLoaders(): IPublicContext['dataLoaders'] {
    return {
      shareableListItemLoader: this.config.shareableListItemLoader,
    };
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
    shareableListItemLoader,
    request: req,
  });
}
