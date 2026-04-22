FROM node:18-alpine

WORKDIR /app/src

COPY src/ ./

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", ".", "-l", "8080"]