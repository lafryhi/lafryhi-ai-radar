FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8080
RUN addgroup --system --gid 1001 seller && adduser --system --uid 1001 seller
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build --chown=seller:seller /app/dist ./dist
COPY --chown=seller:seller package.json ./package.json
USER seller
EXPOSE 8080
CMD ["node", "dist/main.js"]
