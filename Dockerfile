FROM node:18-alpine

WORKDIR /app

# Copiar TODO el contenido de src directamente a /app
COPY src/ .

RUN npm install -g serve

EXPOSE 8080

# Servir el directorio actual (que contiene index.html, login.html, etc.)
CMD ["serve", "-s", ".", "-l", "8080"]