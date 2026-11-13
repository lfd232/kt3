const express = require('express');
const Joi = require('joi');
const { prisma } = require('../config');
const validate = require('../middleware/validate');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const idSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const createSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().trim().min(1).required(),
  role: Joi.string().valid('USER', 'ADMIN'),
});

const updateSchema = Joi.object({
  email: Joi.string().email(),
  name: Joi.string().trim().min(1),
  role: Joi.string().valid('USER', 'ADMIN'),
}).min(1);

// GET /api/users — список с пагинацией
router.get(
  '/',
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { posts: true } } },
      }),
      prisma.user.count(),
    ]);

    res.json({
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  })
);

// GET /api/users/:id — пользователь с постами (новые сверху)
router.get(
  '/:id',
  validate(idSchema, 'params'),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { posts: { orderBy: { createdAt: 'desc' } } },
    });
    if (!user) throw new AppError(404, 'Пользователь не найден');
    res.json(user);
  })
);

// POST /api/users — создать пользователя
router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json(user);
  })
);

// PATCH /api/users/:id — обновить пользователя
router.patch(
  '/:id',
  validate(idSchema, 'params'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(user);
  })
);

// DELETE /api/users/:id — удалить пользователя (вместе с его постами)
router.delete(
  '/:id',
  validate(idSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const exists = await prisma.user.findUnique({ where: { id } });
    if (!exists) throw new AppError(404, 'Пользователь не найден');

    // У связи Post -> User нет каскада, поэтому сначала удаляем посты
    await prisma.$transaction([
      prisma.post.deleteMany({ where: { authorId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.status(204).send();
  })
);

module.exports = router;
