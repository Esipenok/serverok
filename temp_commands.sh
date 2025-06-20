#/bin/bash 
set -e 
echo "=== BLUE-GREEN ОБНОВЛЕНИЕ ===" 
echo "Текущая директория: \$(pwd)" 
cd /root/app 
echo "Переход в директорию: \$(pwd)" 
echo "Проверка текущего статуса..." 
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 
echo "Создание резервной копии..." 
'if [ -d "backup" ]; then rm -rf backup; fi' 
mkdir -p backup 
echo "Подготовка нового кода..." 
mkdir -p new_version 
tar -xzf server_update.tar.gz -C new_version/ 
rm server_update.tar.gz 
echo "Установка зависимостей для новой версии..." 
cd new_version 
npm install --production 
cd .. 
echo "Создание конфигурации для новой версии..." 
cp docker-compose.yml docker-compose-new.yml 
"sed -i 's/dating_app_server/dating_app_server_new/g' docker-compose-new.yml" 
"sed -i 's/dating_app_mongodb/dating_app_mongodb_new/g' docker-compose-new.yml" 
"sed -i 's/3000:3000/3001:3000/g' docker-compose-new.yml" 
echo "Запуск новой версии на порту 3001..." 
docker-compose -f docker-compose-new.yml up -d 
echo "Ожидание запуска новой версии..." 
sleep 15 
echo "Проверка новой версии..." 
'echo "Ответ от новой версии: $NEW_HEALTH"' 
'if [[ "$NEW_HEALTH" == *"success"* ]]; then' 
'    echo "✅ Новая версия работает корректно"' 
'    echo "Обновление Nginx конфигурации..."' 
