FROM node:18-alpine

WORKDIR /app

COPY src ./src

RUN npm install -g serve

EXPOSE 8080

# No cambies WORKDIR, usa la ruta completa
CMD ["serve", "-s", "/app/src", "-l", "8080", "--config", "/app/src/serve.json"]