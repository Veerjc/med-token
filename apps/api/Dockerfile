# ==========================================
# Stage 1: Build NestJS API with Nx
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy full monorepo source
COPY . .

# Build NestJS API for production
ENV CI=true
RUN npx nx build api --configuration=production

# ==========================================
# Stage 2: Minimal Production Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Copy generated production package manifests and bundle
COPY --from=builder /usr/src/app/dist/apps/api/package*.json ./
COPY --from=builder /usr/src/app/dist/apps/api/main.js ./
COPY --from=builder /usr/src/app/dist/apps/api/main.js.map ./

# Install production runtime dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Use non-root user for healthcare security compliance
USER node

EXPOSE 3000

CMD ["node", "main.js"]
