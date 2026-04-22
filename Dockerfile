FROM node:18-alpine

ARG CACHE_BUST=1

WORKDIR /app

COPY src/ ./

RUN npm install -g serve

# Listar archivos para debug
RUN ls -la && ls -la ./admin/ || true && ls -la ./legal/ || true && ls -la ./modules/ || true

EXPOSE 8080

CMD ["serve", "-s", ".", "-l", "8080"]