FROM node:18-alpine

WORKDIR /app

# Copiar todo el contenido de la carpeta src
COPY src ./src

# Instalar serve
RUN npm install -g serve

# Exponer el puerto
EXPOSE 8080

# Servir los archivos estáticos
# El flag --single permite manejar rutas como /login
CMD ["serve", "-s", "src", "-l", "8080", "--single"]