FROM node:18-alpine

WORKDIR /app

COPY src/ ./src/

RUN npm install -g serve

EXPOSE 8080

# Sirve explícitamente desde /app/src
CMD ["serve", "/app/src", "-l", "8080"]