# Debian GNU/Linux 11 (bullseye)
FROM node:18-slim@sha256:15cebc4ed172ec2c33eb5712f4fd98221369ae2343c72feed02bf6d730badf3e

ARG GIT_SHA
ENV GIT_SHA=${GIT_SHA}
ENV NODE_ENV=production

WORKDIR /usr/src/app
COPY . .
RUN apt-get update && \
  apt-get install -y \
    curl && \
  rm -rf /var/lib/apt/lists/*

ENV PORT 4029
EXPOSE ${PORT}

CMD ["npm", "start"]
