FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY packages/ ./packages/
COPY services/inventory-worker/ ./services/inventory-worker/

CMD ["node", "services/inventory-worker/src/worker.js"]
