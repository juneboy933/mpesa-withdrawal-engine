# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nodejs -G nodejs
USER nodejs

EXPOSE 3000

CMD ["node", "dist/main"]