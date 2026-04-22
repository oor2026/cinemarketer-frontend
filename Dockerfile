FROM node:18-alpine

WORKDIR /app

# Copiar archivos
COPY src/ .

# Verificación FORZADA (sin caché)
RUN echo "=== CONTENIDO DE /app ===" && ls -la
RUN echo "=== ¿EXISTE index.html? ===" && test -f index.html && echo "✅ index.html EXISTE" || echo "❌ index.html NO EXISTE"
RUN echo "=== ¿EXISTE login.html? ===" && test -f login.html && echo "✅ login.html EXISTE" || echo "❌ login.html NO EXISTE"
RUN echo "=== CONTENIDO DE /app/admin ===" && ls -la admin/ || echo "admin/ no existe"
RUN echo "=== CONTENIDO DE /app/legal ===" && ls -la legal/ || echo "legal/ no existe"
RUN echo "=== CONTENIDO DE /app/modules ===" && ls -la modules/ || echo "modules/ no existe"

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", ".", "-l", "8080"]