# -----------------------------------------------------------
# Stage 1 – install dependencies
# -----------------------------------------------------------
FROM oven/bun:1.3 AS deps
WORKDIR /app

# Copy only manifests first (better layer caching)
COPY bun.lock package.json ./
RUN bun install --no-save

# -----------------------------------------------------------
# Stage 2 – generate Prisma client + build Next.js (Node runtime:
# Bun JIT SIGILLs on some CPUs during `next build`)
# -----------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# libssl/libcrypto for the schema engine (no apt: debian repos unreachable)
COPY --from=deps /usr/lib/x86_64-linux-gnu/libssl.so.3 /usr/lib/x86_64-linux-gnu/
COPY --from=deps /usr/lib/x86_64-linux-gnu/libcrypto.so.3 /usr/lib/x86_64-linux-gnu/

# Re-use installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Auth config is validated while `next build` collects routes; a placeholder
# satisfies the check — the real secret is injected at runtime by compose.
ARG BETTER_AUTH_SECRET=build-time-placeholder-secret
ARG BETTER_AUTH_URL=http://localhost:3000
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    BETTER_AUTH_URL=$BETTER_AUTH_URL

# Pre-downloaded schema engine (binaries.prisma.sh is unreachable from
# filtered networks) — used at build time and by runtime migrations.
COPY .prisma-engines/schema-engine /usr/local/bin/schema-engine
RUN chmod +x /usr/local/bin/schema-engine

# Generate the Prisma client (output goes to app/generated/prisma)
ENV PRISMA_SCHEMA_ENGINE_PATH=/usr/local/bin/schema-engine \
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN npx prisma generate

# Build the Next.js application
RUN npx next build

# -----------------------------------------------------------
# Stage 3 – production image (Node runs the standalone server)
# -----------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Use the built-in non-root `node` user from the base image

# Copy only what's needed for production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Copy Prisma generated client and schema for runtime migrations
COPY --from=build /app/app/generated/prisma ./app/generated/prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Create uploads dir (backed by a volume)
RUN mkdir -p /app/uploads

# Ensure correct ownership
RUN chown -R node:node /app

USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
