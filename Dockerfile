# Development stage
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

FROM base AS development

RUN npm ci

COPY tsconfig.json ./

CMD ["npm", "run", "dev"]

# Production stage
FROM base AS builder

RUN npm ci

COPY tsconfig.json ./

COPY src ./src

RUN npm run build

FROM base AS production

ENV NODE_ENV=production

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npm", "start"]