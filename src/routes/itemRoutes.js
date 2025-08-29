// src/routes/itemRoutes.js
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/itens:
 *   get:
 *     summary: Lista todos os itens
 *     tags: [Itens]
 *     responses:
 *       '200':
 *         description: OK
 */
router.get('/', itemController.getAllItems);

/**
 * @swagger
 * /api/itens:
 *   post:
 *     summary: Cria um novo item
 *     tags: [Itens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               descricao:
 *                 type: string
 *               categoria:
 *                 type: string
 *               quantidade:
 *                 type: integer
 *     responses:
 *       '201':
 *         description: Criado
 */
router.post('/', itemController.createItem);

module.exports = router;
