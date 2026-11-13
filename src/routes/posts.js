const express = require('express');
const Joi = require('joi');
const { prisma, isPostgres } = require('../config');
const validate = require('../middleware/validate');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const postInclude = {
  author: { select: { id: true, name: true, email: true } },
  tags: true,
};

const idSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const listSchema = Joi.object({
  search: Joi.string().trim().allow(''),
  published: Joi.boolean(),
  authorId: Joi.number().integer().positive(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const tagsField = Joi.array().items(Joi.string().trim().min(1).max(50));

const createSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  content: Joi.string().allow('', null),
  published: Joi.boolean().default(false),
  authorId: Joi.number().integer().required(),
  tags: tagsField.default([]),
});

const updateSchema = Joi.object({
  title: Joi.string().trim().min(1),
  content: Joi.string().allow('', null),
  published: Joi.boolean(),
  tags: tagsField,
}).min(1);

// Уникальные теги -> connectOrCreate по имени
const toConnectOrCreate = (tags) =>
  [...new Set(tags)].map((name) => ({
    where: { name },
    create: { name },
  }));

// GET /api/posts — список с фильтрацией и пагинацией
router.get(
  '/',
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, published, authorId, page, limit } = req.query;

    const where = {};
    if (search) {
      where.title = {
        contains: search,
        ...(isPostgres && { mode: 'insensitive' }),
      };
    }
    if (published !== undefined) where.published = published;
    if (authorId !== undefined) where.authorId = authorId;

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: postInclude,
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  })
);

// GET /api/posts/:id — пост с автором и тегами
router.get(
  '/:id',
  validate(idSchema, 'params'),
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: postInclude,
    });
    if (!post) throw new AppError(404, 'Пост не найден');
    res.json(post);
  })
);

// POST /api/posts — создать пост
router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { title, content, published, authorId, tags } = req.body;

    const author = await prisma.user.findUnique({ where: { id: authorId } });
    if (!author) throw new AppError(404, 'Автор не найден');

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published,
        authorId,
        tags: { connectOrCreate: toConnectOrCreate(tags) },
      },
      include: postInclude,
    });

    res.status(201).json(post);
  })
);

// PATCH /api/posts/:id — обновить пост
router.patch(
  '/:id',
  validate(idSchema, 'params'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tags, ...fields } = req.body;

    const exists = await prisma.post.findUnique({ where: { id } });
    if (!exists) throw new AppError(404, 'Пост не найден');

    const operations = [];

    if (tags) {
      // Сначала сбрасываем старые связи, затем подключаем новые теги
      operations.push(
        prisma.post.update({ where: { id }, data: { tags: { set: [] } } })
      );
      operations.push(
        prisma.post.update({
          where: { id },
          data: { ...fields, tags: { connectOrCreate: toConnectOrCreate(tags) } },
          include: postInclude,
        })
      );
    } else {
      operations.push(
        prisma.post.update({ where: { id }, data: fields, include: postInclude })
      );
    }

    const results = await prisma.$transaction(operations);
    res.json(results[results.length - 1]);
  })
);

// DELETE /api/posts/:id — удалить пост
router.delete(
  '/:id',
  validate(idSchema, 'params'),
  asyncHandler(async (req, res) => {
    await prisma.post.delete({ where: { id: req.params.id } }); // P2025 -> 404
    res.status(204).send();
  })
);

module.exports = router;
