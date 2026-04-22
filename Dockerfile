FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "/app", "-l", "8080"]