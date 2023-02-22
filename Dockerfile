FROM node:18-slim@sha256:81b43146e32b3704663eb243d092b82592eab50f683498c5db9bda07d4ee7e46
WORKDIR /usr/src/app

ARG GIT_SHA

COPY . .

ENV NODE_ENV=production
ENV PORT 4029
ENV GIT_SHA=${GIT_SHA}
ENV AWS_XRAY_CONTEXT_MISSING=LOG_ERROR
ENV AWS_XRAY_LOG_LEVEL=silent

EXPOSE ${PORT}

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

CMD ["npm", "start"]
