FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies separately to leverage Docker layer caching
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source and build the server
COPY src ./src
RUN npm run build

# Runtime image
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV WEBSOCKET_PATH=/collab

COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/server.js"]
