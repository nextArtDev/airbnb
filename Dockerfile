# -----------------------------------------------------------
# Stage 1 – install dependencies
# -----------------------------------------------------------
FROM oven/bun:1.3 AS deps
WORKDIR /app

# Copy only manifests first (better layer caching)
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

# -----------------------------------------------------------
# Stage 2 – generate Prisma client + build Next.js
# -----------------------------------------------------------
FROM oven/bun:1.3 AS build
WORKDIR /app

# Re-use installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client (output goes to app/generated/prisma)
RUN bunx prisma generate

# Build the Next.js application (use node directly to avoid Bun segfault)
RUN npx next build

# -----------------------------------------------------------
# Stage 3 – production image
# -----------------------------------------------------------
FROM oven/bun:1.3 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install dumb-init for proper signal handling in containers
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Copy only what's needed for production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Copy Prisma generated client and schema for runtime migrations
COPY --from=build /app/app/generated/prisma ./app/generated/prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy uploads directory (will be backed by a volume)
COPY --from=build /app/uploads ./uploads

# Create uploads dir if it doesn't exist (first run)
RUN mkdir -p /app/uploads

# Ensure correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use dumb-init so PID 1 handles signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "server.js"]
