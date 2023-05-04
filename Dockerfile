# Debian GNU/Linux 11 (bullseye)
FROM node:18-slim@sha256:2ff9841de879f1a2d2d8ef83183c2d93435c451a36d6cfb37b3331d1386c00f8

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
