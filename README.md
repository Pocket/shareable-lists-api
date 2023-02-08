# Shareable Lists API

The API that manages the ability to create and share lists of related content.

## Application Overview

[Express](https://expressjs.com/) is the Node framework, [Apollo Server](https://www.apollographql.com/docs/apollo-server/) is used in Express to expose a GraphQL API, and [Prisma](https://www.prisma.io/) is used as the ORM. [MySQL](https://www.mysql.com/) is the relational database, though in AWS this is [Aurora Serverless](https://aws.amazon.com/rds/aurora/serverless/).

## Folder structure

- the infrastructure code is present in `.aws`
- the application code is in `src`
- `.circleci` contains circleCI setup

## Local Development

### Fresh Setup

Clone the repo:

- `git clone git@github.com:Pocket/shareable-lists-api.git`
- `cd shareable-lists-api`

Prepare Prisma:

- `npm install`
- `npx prisma generate` (this generates Prisma Typescript types)

Start Docker container:

- `docker-compose up --build -V`

After Docker completes, you should be able to access the GraphQL playground at `http://localhost:4029`.

### Testing Sentry

To test Sentry within a local instance of the API:

- Add `SENTRY_DSN` env to `.docker/local.env`. The DSN value can be found in the [Sentry project](https://sentry.io/settings/pocket/projects/shareable-lists-api/)
- In `docker-compose.yaml`, change the node environment under `app` to `development`:

```
environment:
	- NODE_ENV=development
```

- Add a `try/catch` block in a query / mutation, throw an error and capture it with `Sentry.captureException(err)`
- In `src/server.ts` replace `nonProdPlugins` with:

```
const nonProdPlugins = [
	ApolloServerPluginLandingPageGraphQLPlayground(),
	ApolloServerPluginInlineTrace(),
];
```
