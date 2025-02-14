FROM node:lts-alpine AS builder

WORKDIR /app

COPY . .

RUN apk add --no-cache openssl && \
    npm clean-install --ignore-scripts && \
    npx prisma generate && \
    npm run build


FROM node:lts-alpine

WORKDIR /app

COPY --from=builder /app/dist/ .
COPY package*.json ./
COPY --from=builder /app/db/schema.prisma ./db/

RUN apk add --no-cache openssl && \
    npm clean-install --ignore-scripts --omit=dev && \
    npx prisma generate

RUN chown node:node -R /app

USER node
EXPOSE 8080

ENTRYPOINT ["npm", "run", "start:prod"]