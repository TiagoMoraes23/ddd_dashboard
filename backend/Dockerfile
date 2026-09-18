FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    for i in 1 2 3 4 5; do \
      npm ci --no-audit --no-fund && test -d node_modules/express && break; \
      echo "npm ci falhou, tentativa $i, tentando de novo..."; \
      rm -rf node_modules; \
      sleep 3; \
    done && test -d node_modules/express
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
