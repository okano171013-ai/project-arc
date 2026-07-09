# Project ARC — Version1
FROM node:20-slim AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

RUN pnpm build

CMD ["node", "dist/infrastructure/cli/reflect.js"]
