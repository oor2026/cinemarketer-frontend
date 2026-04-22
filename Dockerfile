FROM node:18-alpine

WORKDIR /app

COPY src ./src

RUN npm install -g serve

EXPOSE 8080

# El archivo serve.json está dentro de src/
CMD ["serve", "-s", "src", "-l", "8080", "--config", "src/serve.json"]