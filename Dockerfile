# freeforallloggingandstatus — Node serves API + built Vue 3 app
FROM node:20-alpine AS builder

WORKDIR /app

# Backend deps
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Frontend build
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY server/package*.json server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/

COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]
