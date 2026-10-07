# syntax = docker/dockerfile:1

# Plain Node, run directly against .ts source — Node 24 strips types itself, so
# there is no bundler or build stage: the image is the same source this repo
# typechecks and tests against. node:sqlite (also stdlib, no native module to
# compile) persists to /data, the one thing fly.toml mounts as a volume.
# node and pnpm versions here repeat mise.toml's pins; mise.toml is the one to follow
FROM node:24.21.0-bookworm-slim

WORKDIR /app
ENV PORT=8080

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY src ./src
COPY public ./public
COPY README.md ./
COPY docs ./docs

EXPOSE 8080
CMD ["node", "src/server.ts"]
