@echo off
REM Запуск Zookeeper и Kafka через Docker

title Kafka + Zookeeper (Docker)

echo Запуск Zookeeper...
docker run -d --name local_zookeeper -p 2181:2181 -e ALLOW_ANONYMOUS_LOGIN=yes bitnami/zookeeper:3.8

echo Запуск Kafka...
docker run -d --name local_kafka -p 9092:9092 --link local_zookeeper:zookeeper -e KAFKA_BROKER_ID=1 -e KAFKA_CFG_ZOOKEEPER_CONNECT=local_zookeeper:2181 -e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092 -e KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 -e ALLOW_PLAINTEXT_LISTENER=yes bitnami/kafka:3.6

echo Kafka и Zookeeper запущены!
pause 