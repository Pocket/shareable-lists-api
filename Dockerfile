# Debian GNU/Linux 11 (bullseye)
FROM node:18-slim@sha256:b8a9ad50d8833a2aede22170a517e64c79776e9145811d7f6649bb123fb4e258

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
