# Base image for dependencies
FROM node:22-alpine AS dependencies

# Install pnpm globally
RUN npm install -g pnpm@11.0.8

WORKDIR /app

# Copy only package files for better cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ALL dependencies (dev + prod) for build
RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS build

# Copy source code ONLY for build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

# Build application
RUN pnpm run build

# Production stage
FROM node:22-alpine AS production

# Install minimal runtime dependencies
RUN apk add --no-cache \
  dumb-init

# Install pnpm
RUN npm install -g pnpm@11.0.8

# Create app user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app

ENV NODE_ENV=production \
  TZ=UTC

# Copy package files
COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application (compiled JS)
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist

# Create logs directory with correct permissions BEFORE switching user
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

# Switch to non-root user
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the app
CMD pnpm run start:prod
