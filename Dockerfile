# Используем официальный Debian-based образ Node.js
FROM node:18

# Создаем директорию приложения
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем Python и dev-зависимости для canvas
RUN apt-get update && apt-get install -y python3 make g++ libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

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