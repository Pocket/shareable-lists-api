import { PrismaClient } from '@prisma/client';
import { client } from '../database/client';
import { createShareableListItemDataLoaders } from '../dataLoaders/shareableListItemLoader';
import DataLoader from 'dataloader';
import { ShareableListItem } from '../database/types';

/**
 * Context components specifically for the public graph.
 */

export interface IPublicContext {
  db: PrismaClient;
  // Pocket userId coming in from the http headers
  userId: number | bigint;
  dataLoaders: {
    shareableListItemsByUrl: DataLoader<string, ShareableListItem>;
  };
}

export class PublicContextManager implements IPublicContext {
  public readonly dataLoaders: IPublicContext['dataLoaders'];
  constructor(
    private config: {
      db: PrismaClient;
      request: any;
    }
  ) {
    // lets initialize the dataLoader and pass the userId
    // for now we only need userId, so not passing the entire context object
    this.dataLoaders = {
      ...createShareableListItemDataLoaders(this.userId),
    };
  }

  get db(): IPublicContext['db'] {
    return this.config.db;
  }

  get userId(): IPublicContext['userId'] {
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
    db: client(),
    request: req,
  });
}
