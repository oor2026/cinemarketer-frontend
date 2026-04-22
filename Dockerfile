FROM node:18-alpine

WORKDIR /app

COPY src ./src

RUN npm install -g serve

EXPOSE 8080

# Entra a la carpeta src y ejecuta serve desde ahí
WORKDIR /app/src

CMD ["serve", "-s", ".", "-l", "8080", "--config", "serve.json"]