# Используем официальный образ Node.js
FROM node:18-alpine

# Создаем директорию приложения
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Создаем директории для загрузок и логов
RUN mkdir -p uploads logs
RUN chmod 777 uploads logs

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dev-start.js"] 