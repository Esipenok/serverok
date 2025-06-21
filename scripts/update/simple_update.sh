#!/bin/bash
# Простой скрипт для обновления API-сервера
# Запускать на сервере после копирования архива server_update.tar.gz

set -e  # Остановка при ошибках

echo "=== ОБНОВЛЕНИЕ API-СЕРВЕРА ==="
echo "Текущая директория: $(pwd)"

# Проверяем наличие архива
if [ ! -f "server_update.tar.gz" ]; then
    echo "Ошибка: Архив server_update.tar.gz не найден"
    exit 1
fi

# Создаем резервную копию
echo "Создание резервной копии..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Список директорий и файлов, которые нужно исключить из бэкапа
echo "Создание списка исключений..."
cat > exclude_list.txt << 'EOF'
./node_modules
./uploads
./logs
./backups
./.git
./.github
./.vscode
./.idea
./temp
./*.log
./*.tar.gz
./*.zip
./server_update.tar.gz
./simple_update.sh
./exclude_list.txt
EOF

# Копируем все файлы в бэкап, кроме исключений
echo "Копирование файлов в бэкап..."
rsync -av --exclude-from=exclude_list.txt . $BACKUP_DIR/ || true

# Если rsync не установлен, используем find и cp
if [ $? -ne 0 ]; then
  echo "rsync не найден, используем find и cp..."
  find . -type f -not -path "./node_modules/*" -not -path "./uploads/*" -not -path "./logs/*" -not -path "./backups/*" -not -path "./.git/*" -not -path "./.github/*" -not -path "./.vscode/*" -not -path "./.idea/*" -not -path "./temp/*" -not -name "*.log" -not -name "*.tar.gz" -not -name "*.zip" -not -name "server_update.tar.gz" -not -name "simple_update.sh" -not -name "exclude_list.txt" -exec cp --parents {} $BACKUP_DIR/ \;
fi

# Удаляем временный файл
rm -f exclude_list.txt

echo "Резервная копия создана в $BACKUP_DIR"

# Создаем файл с информацией о бэкапе
echo "Создание информации о бэкапе..."
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Дата создания: $(date)
Описание: Автоматический бэкап перед обновлением
Контейнеры:
$(docker ps -a)

Версии:
Node: $(node -v)
NPM: $(npm -v)
EOF

# Останавливаем контейнеры
echo "Останавливаем контейнеры Docker..."
docker-compose down

# Создаем список директорий, которые нужно сохранить
echo "Создание списка директорий для сохранения..."
cat > preserve_dirs.txt << 'EOF'
node_modules
uploads
logs
.env
ssl
backups
EOF

# Создаем временную директорию для сохранения важных файлов
echo "Сохранение важных файлов и директорий..."
mkdir -p temp_save
while IFS= read -r dir; do
  if [ -e "$dir" ]; then
    echo "Сохранение: $dir"
    cp -r "$dir" temp_save/ 2>/dev/null || true
  fi
done < preserve_dirs.txt

# Удаляем все файлы и директории, кроме исключений
echo "Удаление текущих файлов проекта..."
find . -mindepth 1 \
  -not -path "./temp_save*" \
  -not -path "./preserve_dirs.txt*" \
  -not -path "./server_update.tar.gz*" \
  -not -path "./simple_update.sh*" \
  -not -path "./backups*" \
  -exec rm -rf {} \; 2>/dev/null || true

# Распаковываем новую версию
echo "Распаковка новой версии..."
tar -xzf server_update.tar.gz
rm server_update.tar.gz

# Восстанавливаем сохраненные файлы и директории
echo "Восстановление сохраненных файлов и директорий..."
cp -r temp_save/* . 2>/dev/null || true
rm -rf temp_save preserve_dirs.txt

# Устанавливаем зависимости
echo "Установка зависимостей..."
npm install --production

# Запускаем контейнеры
echo "Запуск контейнеров Docker..."
docker-compose up -d

# Ждем запуска
echo "Ожидание запуска сервера (10 секунд)..."
sleep 10

# Проверяем статус
echo "Проверка статуса контейнеров..."
docker ps

# Проверяем работоспособность API
echo "Проверка API..."
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health || echo "FAIL")
echo "Ответ от API: $HEALTH_CHECK"

if [[ "$HEALTH_CHECK" == *"success"* ]]; then
    echo "✅ API работает корректно"
else
    echo "⚠️ API не отвечает или отвечает с ошибкой"
    echo "Проверьте логи: docker logs dating_app_server"
fi

echo "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===" 