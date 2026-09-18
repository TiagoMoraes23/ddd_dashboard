FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    npm config set update-notifier false && \
    for i in 1 2 3 4 5; do \
      npm ci --no-audit --no-fund --prefer-online && test -f node_modules/.bin/vite && break; \
      echo "npm ci falhou, tentativa $i, tentando de novo..."; \
      rm -rf node_modules; \
      sleep 3; \
    done && test -f node_modules/.bin/vite
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
