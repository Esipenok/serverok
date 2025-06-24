# Используем официальный образ Node.js
FROM node:18-alpine

# Создаем директорию приложения
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем Python и dev-зависимости для canvas
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev jpeg-dev giflib-dev

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Создаем директории для загрузок, логов и SSL-сертификатов
RUN mkdir -p uploads logs ssl
RUN chmod 777 uploads logs
RUN chmod 755 ssl

# Открываем порты (HTTP и HTTPS)
EXPOSE 3000

# Запускаем приложение
CMD ["node", "server.js"] 