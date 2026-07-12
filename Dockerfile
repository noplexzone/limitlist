# Stage 1: deps
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: builder
FROM node:22-slim AS builder
WORKDIR /app
# Prisma query engine requires OpenSSL during generate/build.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: runner
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma query engine requires OpenSSL on Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

RUN mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy the Prisma CLI so `migrate deploy` uses the pinned v5, not whatever npx downloads
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Run as root so Docker bind mounts such as ./data:/data are writable without
# host-side UID/GID preparation. This can be tightened later with a custom
# entrypoint or explicit PUID/PGID support for Unraid.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
