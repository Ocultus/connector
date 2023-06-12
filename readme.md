Для сборки и запуска приложения необходимы:
1. Postgres не ниже версии 11.13
2. RabbitMq не ниже версии 3.9
3. Yarn не ниже версии 1.22.19

Для запуска RabbitMQ и Postgres c автоматической миграцей можно использовать готовый docker-compose 
```bash
docker-compose up postgres rabbitmq 
```

Для ручного создания схемы базы данных следует запустить скрипт,
находящийся в каталоге migrations репозитория приложения.

Сборка производится путём выполнения команды «yarn build» в корне проекта.
Результат будет расположен в каталоге dist.

Настройку параметров сервера допускается выполнять как до
сборки, так и после. Все параметры хранятся в файле “.env” в корне
проекта. Пример его заполнения есть там же - “example.env”.
Необходимо пояснить значения всех его параметров.

<ul>
<li> PG_DB, PG_USER, PG_PASS, PG_HOST, PG_PORT - параметры базы данных(имя пользователь, пароль, адрес, порт) </li>
<li> AMQP_USERNAME, AMQP_PASS, AMQP_HOSTNAME -
параметры брокера сообщений(Пользователь, пароль, адрес) </li>
<li> CLOUD_STORAGE_PORT - порт облачного сервиса 
● CLOUD_STORAGE_KEY, CLOUD_STORAGE_KEY_ID,
CLOUD_STORAGE_BUCKET, CLOUD_STORAGE_REGION,
CLOUD_STORAGE_ENDPOINT_URL - параметры S3 хранилища </li>
<li> ENDPOINTS_CLOUD_STORAGE_URL, ENDPOINTS_CORE_URL
- адрес основного и облачных сервисов </li>
<li> AUTH_CREDENTIALS_SECRET - секретный ключ, используемый
при шифрования JWT токена </li>
<li> CORE_MESSAGE_EXCHANGE, CORE_ACTIONS_EXCHANGE -
имя обменников(exchanges), используемые для брокера сообщений </li>


Для запуска необходимо запустить 4 сервиса последовательными
командам: 

```bash
yarn run run:cloud-storage
yarn run run:core
yarn run run:vk-gateway
yarn run run:tg-gateway
```
