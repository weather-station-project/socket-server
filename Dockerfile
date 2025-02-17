FROM node:lts-alpine AS builder

WORKDIR /app

COPY . .

RUN apk add --no-cache openssl && \
    npm clean-install --ignore-scripts && \
    npm run build


FROM node:lts-alpine

WORKDIR /app

COPY --from=builder /app/dist/ .
COPY package*.json ./

RUN apk add --no-cache openssl && npm clean-install --ignore-scripts --omit=dev
RUN chown node:node -R /app

USER node
EXPOSE 8080

ENTRYPOINT ["npm", "run", "start:prod"]