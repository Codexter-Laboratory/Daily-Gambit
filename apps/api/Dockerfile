# Build from the repository root:  docker build -f apps/api/Dockerfile -t daily-gambit-api .
# The same image runs the API (default) or the worker:  docker run ... node dist/worker.js

FROM node:22-slim AS build
WORKDIR /app
# Prisma needs OpenSSL at build and run time.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install only what the API needs. The lockfile covers every workspace, so every package.json is copied.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci --workspace @daily-gambit/api --ignore-scripts

COPY apps/api apps/api
COPY packages packages
# The build script generates the Prisma client and then bundles the API and worker.
RUN npm run build --workspace @daily-gambit/api

FROM node:22-slim AS run
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/generated apps/api/generated
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/package.json apps/api/package.json
WORKDIR /app/apps/api
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
