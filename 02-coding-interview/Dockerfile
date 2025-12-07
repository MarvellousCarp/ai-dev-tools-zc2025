# Multi-stage build to bundle web and server into a single container
FROM node:20-alpine AS base
WORKDIR /app

# Install workspace dependencies first for better caching
COPY package*.json ./
COPY server/package*.json server/tsconfig.json ./server/
COPY web/package*.json ./web/
RUN npm ci

# Copy sources and build both applications
COPY server ./server
COPY web ./web
RUN npm run build --workspace web
RUN npm run build --workspace server

# Runtime image
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV WEBSOCKET_PATH=/collab

COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/web/dist ./web/dist

EXPOSE 3001
CMD ["node", "server/dist/server.js"]
