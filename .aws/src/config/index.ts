const name = 'ShareableListsApi';
const domainPrefix = 'shareablelistsapi';
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'Dev' : 'Prod';
const domain = isDev
  ? `${domainPrefix}.getpocket.dev`
  : `${domainPrefix}.readitlater.com`;
const graphqlVariant = isDev ? 'development' : 'current';
const rds = {
  minCapacity: 1,
  maxCapacity: isDev ? 1 : undefined,
};
const githubConnectionArn = isDev
  ? 'arn:aws:codestar-connections:us-east-1:410318598490:connection/7426c139-1aa0-49e2-aabc-5aef11092032'
  : 'arn:aws:codestar-connections:us-east-1:996905175585:connection/5fa5aa2b-a2d2-43e3-ab5a-72ececfc1870';
const branch = isDev ? 'dev' : 'main';

//Arbitrary size and count for cache. No logic was used in deciding this.
const cacheNodes = isDev ? 2 : 2;
const cacheSize = isDev ? 'cache.t2.micro' : 'cache.t3.medium';

export const config = {
  name,
  isDev,
  prefix: `${name}-${environment}`,
  circleCIPrefix: `/${name}/CircleCI/${environment}`,
  shortName: 'SLAPI',
  environment,
  domain,
  codePipeline: {
    githubConnectionArn,
    repository: 'pocket/shareable-lists-api',
    branch,
  },
  graphqlVariant,
  rds,
  cacheNodes,
  cacheSize,
  tags: {
    service: name,
    environment,
  },
};
