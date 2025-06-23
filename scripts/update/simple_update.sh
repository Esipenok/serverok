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

# Список директорий для исключения
EXCLUDE_DIRS="node_modules uploads logs backups .git .github .vscode .idea temp ssl"

# Копируем все файлы в корне
echo "Копирование файлов в корне..."
for file in $(ls -A | grep -v "^\." | grep -v "^node_modules$" | grep -v "^uploads$" | grep -v "^logs$" | grep -v "^backups$" | grep -v "^temp$" | grep -v "^ssl$" | grep -v "server_update.tar.gz" | grep -v "simple_update.sh"); do
  echo "Копирование: $file"
  cp -r "$file" "$BACKUP_DIR/" 2>/dev/null || true
done

# Копируем скрытые файлы в корне (кроме .git, .github и т.д.)
echo "Копирование скрытых файлов..."
for file in $(ls -A | grep "^\." | grep -v "^\.git$" | grep -v "^\.github$" | grep -v "^\.vscode$" | grep -v "^\.idea$"); do
  echo "Копирование: $file"
  cp -r "$file" "$BACKUP_DIR/" 2>/dev/null || true
done

echo "Резервная копия создана в $BACKUP_DIR"

# Создаем файл с информацией о бэкапе
echo "Создание информации о бэкапе..."
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Дата создания: $(date)
Описание: Автоматический бэкап перед обновлением

Содержимое бэкапа:
$(find $BACKUP_DIR -type f | grep -v backup_info.txt | sort)
EOF

# Выводим список файлов в бэкапе для проверки
echo "Файлы в бэкапе:"
ls -la "$BACKUP_DIR"

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

# Пересобираем Docker образ с новым кодом
echo "Пересборка Docker образа..."
docker-compose build app

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
# Используем специальный endpoint /health без HTTPS редиректа
HEALTH_CHECK=$(curl -s http://localhost:3000/health 2>/dev/null || echo "FAIL")
echo "Ответ от API: $HEALTH_CHECK"

if [[ "$HEALTH_CHECK" == *"success"* ]] || [[ "$HEALTH_CHECK" == *"API работает"* ]]; then
    echo "✅ API работает корректно"
else
    echo "⚠️ API не отвечает или отвечает с ошибкой"
    echo "Проверьте логи: docker logs dating_app_server"
fi

echo "=== ОБНОВЛЕНИЕ ЗАВЕРШЕНО ===" 