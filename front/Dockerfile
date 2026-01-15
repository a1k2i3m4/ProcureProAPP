FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Используем тихий запуск
CMD ["npm", "run", "dev"]
