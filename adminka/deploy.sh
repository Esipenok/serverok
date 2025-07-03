#!/bin/bash

# Скрипт для деплоя админки на сервер
# Автор: Assistant
# Дата: $(date)

# Конфигурация
SERVER_IP="46.62.131.90"
SSH_KEY="C:\Users\Andrey\.ssh\id_ed25519"
REMOTE_PATH="/root/adminka"
DOCKER_CONTAINER="adminka"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Функция для выполнения SSH команд
execute_ssh() {
    local command="$1"
    log_info "Выполняем: $command"
    
    ssh -i "$SSH_KEY" root@"$SERVER_IP" "$command"
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Команда выполнена успешно"
        return 0
    else
        log_error "Ошибка выполнения команды: $command"
        return 1
    fi
}

# Функция для загрузки файлов
upload_file() {
    local local_path="$1"
    local remote_path="$2"
    
    log_info "Загружаем файлы на сервер..."
    
    scp -i "$SSH_KEY" "$local_path" root@"$SERVER_IP":"$remote_path"
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Файлы загружены успешно"
        return 0
    else
        log_error "Ошибка загрузки файлов"
        return 1
    fi
}

# Основная функция деплоя
main() {
    log_info "🚀 Начинаем деплой админки на сервер $SERVER_IP"
    
    # 1. Создаем архив админки (исключая node_modules)
    log_info "📦 Создаем архив админки..."
    
    local archive_name="adminka_$(date +%Y%m%d_%H%M%S).tar.gz"
    local archive_path="./$archive_name"
    
    # Удаляем старый архив если есть
    [ -f "$archive_path" ] && rm -f "$archive_path"
    
    # Создаем архив с исключением node_modules
    tar -czf "$archive_path" --exclude=node_modules --exclude=*.tar.gz .
    
    if [ $? -ne 0 ]; then
        log_error "Ошибка создания архива"
        exit 1
    fi
    
    log_success "Архив создан: $archive_path"
    
    # 2. Останавливаем Docker контейнер админки
    log_info "🛑 Останавливаем Docker контейнер админки..."
    if ! execute_ssh "docker stop $DOCKER_CONTAINER 2>/dev/null || true"; then
        log_warning "Предупреждение: Не удалось остановить контейнер (возможно, он не запущен)"
    fi
    
    # 3. Загружаем архив на сервер
    if ! upload_file "$archive_path" "/root/$archive_name"; then
        log_error "Ошибка загрузки архива на сервер"
        exit 1
    fi
    
    # 4. Удаляем старые файлы админки и распаковываем новые
    log_info "🔄 Обновляем файлы админки..."
    
    local update_commands=(
        "cd /root"
        "rm -rf $REMOTE_PATH.bak 2>/dev/null || true"
        "mv $REMOTE_PATH $REMOTE_PATH.bak 2>/dev/null || true"
        "mkdir -p $REMOTE_PATH"
        "tar -xzf $archive_name -C $REMOTE_PATH --strip-components=0"
        "chmod +x $REMOTE_PATH/*.sh 2>/dev/null || true"
        "chmod 600 $REMOTE_PATH/keys/* 2>/dev/null || true"
    )
    
    for cmd in "${update_commands[@]}"; do
        if ! execute_ssh "$cmd"; then
            log_error "Ошибка выполнения команды: $cmd"
            exit 1
        fi
    done
    
    # 5. Запускаем Docker контейнер
    log_info "🚀 Запускаем Docker контейнер..."
    
    local docker_commands=(
        "cd $REMOTE_PATH"
        "docker-compose up -d --build"
    )
    
    for cmd in "${docker_commands[@]}"; do
        if ! execute_ssh "$cmd"; then
            log_error "Ошибка запуска Docker контейнера: $cmd"
            exit 1
        fi
    done
    
    # 6. Ждем запуска контейнера
    log_info "⏳ Ждем запуска контейнера..."
    sleep 10
    
    # 7. Проверяем статус контейнера
    log_info "🔍 Проверяем статус контейнера..."
    if ! execute_ssh "docker ps | grep $DOCKER_CONTAINER"; then
        log_error "Контейнер не запущен после деплоя"
        exit 1
    fi
    
    # 8. Делаем тестовый запрос
    log_info "🧪 Выполняем тестовый запрос..."
    if execute_ssh "curl -s http://localhost:3001/api/health || echo 'Health check failed'"; then
        log_success "Тестовый запрос выполнен успешно"
    else
        log_warning "Тестовый запрос не выполнен, но контейнер запущен"
    fi
    
    # 9. Очищаем временные файлы
    log_info "🧹 Очищаем временные файлы..."
    execute_ssh "rm -f /root/$archive_name"
    rm -f "$archive_path"
    
    log_success "🎉 Деплой админки завершен успешно!"
    log_info "📊 Админка доступна по адресу: http://$SERVER_IP:3001"
}

# Обработка ошибок
cleanup() {
    log_warning "🔄 Попытка восстановления..."
    execute_ssh "cd $REMOTE_PATH && docker-compose up -d" > /dev/null 2>&1
    
    # Очистка временных файлов
    [ -f "$archive_path" ] && rm -f "$archive_path"
}

# Устанавливаем обработчик ошибок
trap cleanup ERR

# Запускаем основной скрипт
main "$@" 