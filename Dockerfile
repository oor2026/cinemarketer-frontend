FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install -g serve

EXPOSE 8080

CMD ["sh", "-c", "serve -s /app/src -l ${PORT:-8080}"]