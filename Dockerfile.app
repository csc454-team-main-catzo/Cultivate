# ---------------------------------------------------------------
# Cultivate Frontend — Multi-stage Docker build
# Build context: repo root (needs root package.json + lockfile)
# ---------------------------------------------------------------

# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY pkgs/app/package.json ./pkgs/app/
RUN npm ci --workspace=emz

# Stage 2: Build with Vite
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY pkgs/app ./pkgs/app
WORKDIR /app/pkgs/app
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npx tsc -b && npx vite build

# Stage 3: Serve with nginx
FROM nginx:1.27-alpine
COPY --from=build /app/pkgs/app/dist /usr/share/nginx/html
COPY pkgs/app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
