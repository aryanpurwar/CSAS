# Multi-stage build. The final image contains only production dependencies and the
# built client, served by the Node API as a single origin.
FROM node:20-alpine AS client-build
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-deps
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Run as a non-root user.
RUN addgroup -S app && adduser -S app -G app
COPY --from=server-deps /app/node_modules ./node_modules
COPY server/ ./
COPY --from=client-build /client/dist ../client/dist
USER app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s \
  CMD node -e "fetch('http://localhost:5000/api/health').then(r=>r.json()).then(d=>process.exit(d.status==='ok'?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
