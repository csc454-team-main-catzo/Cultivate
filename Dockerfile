# ---------------------------------------------------------------
# Cultivate Server — Multi-stage Docker build
# Build context: repo root (needs root package.json + lockfile)
# ---------------------------------------------------------------

# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY pkgs/server/package.json ./pkgs/server/
RUN npm ci --workspace=server

# Stage 2: Build TypeScript
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY pkgs/server ./pkgs/server
WORKDIR /app/pkgs/server
RUN npx tsc

# Stage 3: Production runtime
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY pkgs/server/package.json ./pkgs/server/
RUN npm ci --workspace=server --omit=dev
COPY --from=build /app/pkgs/server/dist ./pkgs/server/dist
WORKDIR /app/pkgs/server
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]