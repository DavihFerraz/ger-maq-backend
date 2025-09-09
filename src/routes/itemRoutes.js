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


/**
 * @swagger
 * /api/itens/{id}:
 *   delete:
 *     summary: Apaga um item do inventário
 *     tags: [Itens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do item a ser apagado
 *     responses:
 *       '200':
 *         description: Item apagado com sucesso
 *       '404':
 *         description: Item não encontrado
 */
router.delete('/:id', itemController.deleteItem);
/**
 * @swagger
 * /api/itens/{id}:
 *   put:
 *     summary: Atualiza um item existente
 *     tags: [Itens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do item a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patrimonio:
 *                 type: string
 *               categoria:
 *                 type: string
 *               modelo_tipo:
 *                 type: string
 *               status:
 *                 type: string
 *               setor:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Item atualizado com sucesso
 *       '404':
 *         description: Item não encontrado
 */
router.put('/:id', itemController.updateItem);
module.exports = router;
