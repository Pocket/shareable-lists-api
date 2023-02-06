# Shareable Lists API

The API that manages the ability to create and share lists of related content.

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

```

```
