FROM node:18-alpine

WORKDIR /app

# Copiar los archivos estáticos
COPY src ./src

# Instalar serve globalmente
RUN npm install -g serve

# Exponer el puerto
EXPOSE 8080

# Servir los archivos estáticos
CMD ["serve", "-s", "src", "-l", "8080"]