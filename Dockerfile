FROM node:18-alpine

WORKDIR /app

COPY src/ ./src/

# Verificaciones separadas para que se vean todas
RUN echo "===== CONTENIDO DE /app =====" && ls -la /app
RUN echo "===== CONTENIDO DE /app/src =====" && ls -la /app/src
RUN echo "===== BUSCANDO index.html =====" && ls -la /app/src/index.html || echo "index.html NO ENCONTRADO"
RUN echo "===== BUSCANDO login.html =====" && ls -la /app/src/login.html || echo "login.html NO ENCONTRADO"
RUN echo "===== CONTENIDO DE /app/src/admin =====" && ls -la /app/src/admin/
RUN echo "===== CONTENIDO DE /app/src/legal =====" && ls -la /app/src/legal/
RUN echo "===== CONTENIDO DE /app/src/modules =====" && ls -la /app/src/modules/

RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "/app/src", "-l", "8080"]