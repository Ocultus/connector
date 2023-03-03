FROM node:18-alpine3.15 as dev

WORKDIR /app/

COPY ./yarn.lock ./package.json ./tsconfig.json ./

COPY src src 

RUN yarn 

FROM node:18-alpine3.15 as builder

WORKDIR /app/

COPY --from=dev /app/ /app/

RUN yarn build

FROM node:18-alpine3.15

WORKDIR /app/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./

RUN NODE_ENV=production
RUN yarn

COPY --from=builder /app/dist ./dist