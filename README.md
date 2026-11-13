# kt03 — REST API блог-платформы

Express + Prisma ORM + Joi. По умолчанию SQLite, можно PostgreSQL.

## Запуск

```bash
npm install
cp .env.example .env        # если .env ещё нет
npm run prisma:migrate      # создаст БД и миграцию в prisma/migrations
npm run dev                 # или npm start
```

## PostgreSQL
1. В `prisma/schema.prisma` поменять `provider = "sqlite"` на `"postgresql"`.
2. В `.env` указать `DATABASE_URL="postgresql://user:password@localhost:5432/blog?schema=public"`.
3. Удалить папку `prisma/migrations` (кроме `.gitkeep`) и выполнить `npm run prisma:migrate`.

## Маршруты

| Метод  | URL             | Описание                         |
|--------|-----------------|----------------------------------|
| GET    | /api/users      | Список с пагинацией (page, limit)|
| GET    | /api/users/:id  | Пользователь с постами (desc)    |
| POST   | /api/users      | Создать пользователя             |
| PATCH  | /api/users/:id  | Обновить пользователя            |
| DELETE | /api/users/:id  | Удалить пользователя             |
| GET    | /api/posts      | search, published, authorId, page, limit |
| GET    | /api/posts/:id  | Пост с автором и тегами          |
| POST   | /api/posts      | Создать пост                     |
| PATCH  | /api/posts/:id  | Обновить пост                    |
| DELETE | /api/posts/:id  | Удалить пост                     |

## Примеры

```bash
curl -X POST localhost:3000/api/users -H 'Content-Type: application/json' \
  -d '{"email":"a@a.com","name":"Anna"}'

curl -X POST localhost:3000/api/posts -H 'Content-Type: application/json' \
  -d '{"title":"Hello","content":"First","published":true,"authorId":1,"tags":["js","node"]}'

curl 'localhost:3000/api/posts?search=hel&published=true&authorId=1&page=1&limit=5'
```
