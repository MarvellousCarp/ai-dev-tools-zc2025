# Build the web client and server
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install dependencies using the workspace lockfile
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci --workspaces --include-workspace-root

# Copy source code
COPY server ./server
COPY web ./web

# Build web (Vite) and server (TypeScript)
ARG VITE_COLLAB_ENDPOINT=ws://localhost:3001/collab
ENV VITE_COLLAB_ENDPOINT=${VITE_COLLAB_ENDPOINT}
RUN npm run build && npm --workspace server run build

# Runtime image
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# Copy dependency tree and built artifacts
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/web/dist ./web/dist

EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "server"]
