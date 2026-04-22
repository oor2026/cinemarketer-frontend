FROM node:18-alpine

WORKDIR /app

COPY src ./src

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "src", "-l", "8080", "--single", "--redirect-fallback"]