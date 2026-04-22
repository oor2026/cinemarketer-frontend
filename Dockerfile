FROM node:18-alpine

WORKDIR /app

COPY src/ ./src/

RUN npm install -g serve

EXPOSE 8080

# Muestra el directorio y luego ejecuta serve
CMD sh -c "echo '=== DIRECTORIO ACTUAL ===' && pwd && ls -la && echo '=== CONTENIDO DE /app/src ===' && ls -la /app/src && serve /app/src -l 8080"