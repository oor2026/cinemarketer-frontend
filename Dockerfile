FROM node:18-alpine

WORKDIR /app

COPY src ./src

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "./src", "-l", "8080"]