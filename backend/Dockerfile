FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git python3 make g++
COPY package.json ./
RUN npm install
COPY . .
ARG APP_VERSION=0.0.0
ENV APP_VERSION=${APP_VERSION}
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fibernode
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src ./src
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && \
    mkdir -p /app/wa-sessions /app/uploads && \
    chown -R fibernode:nodejs /app
USER fibernode
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
