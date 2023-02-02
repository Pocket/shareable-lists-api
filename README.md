# 

## Folder structure

- the infrastructure code is present in `.aws`
- the application code is in `src`
- `.circleci` contains circleCI setup

## Develop Locally

### Using Docker

```bash
npm ci
docker-compose up
```

### Not Using Docker

Alternatively if you do not need to use the docker services in your app, like snowplow, you can do:

```bash
npm ci
npm run start:dev
```
