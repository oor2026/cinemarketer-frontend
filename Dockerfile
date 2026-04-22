FROM node:18-alpine

WORKDIR /app

# Copia TODO incluyendo subcarpetas
COPY src/ ./src/

# Verificación
RUN ls -la && ls -la ./src/ && ls -la ./src/admin/

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "./src", "-l", "8080"]