# cadex

Переменные окружения для запуска сервиса локально

```bash
    REDIS_HOST=localhost
    REDIS_PORT=6379
    PORT=3000
```

Запуск сервиса в контейнере

```bash
    docker-compose up
```

Сборка и запуск сервиса локально

```bash
    npm run build
    npm run start
```

Пример запроса
```bash
    curl --location 'http://localhost:3000/reserve' \
    --header 'Content-Type: application/json' \
    --data '{
        "user_id": 11,
        "seat_id": "A10"
    }'
```