FROM node:18-alpine

WORKDIR /app

# Copiar TODO el contenido de src (incluyendo subcarpetas)
COPY src/ ./src/

# Instalar serve
RUN npm install -g serve

# Listar archivos para debug (opcional, pero ayuda)
RUN ls -la ./src/

EXPOSE 8080

# Servir desde la carpeta src
CMD ["serve", "-s", "./src", "-l", "8080"]