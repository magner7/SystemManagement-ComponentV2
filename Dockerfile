FROM node:24-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# we need esbuild at build time; install dev deps temporarily
RUN npm i --no-save esbuild

COPY . .

RUN npm run build:dist

ENV NODE_ENV=production
CMD ["node","--enable-source-maps","dist/index.js"]
