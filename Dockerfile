FROM node:18-alpine

WORKDIR /app

COPY src ./src
COPY serve.json ./serve.json

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "src", "-l", "8080", "--config", "serve.json"]