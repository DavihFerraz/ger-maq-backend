// src/routes/emprestimoRoutes.js
const express = require('express');
const router = express.Router();
const emprestimoController = require('../controllers/emprestimoController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

/**
 * @swagger
 * /api/emprestimos:
 *   get:
 *     summary: Lista empréstimos ativos
 *     tags: [Empréstimos]
 *     responses:
 *       '200':
 *         description: OK
 */
router.get('/', emprestimoController.getActiveEmprestimos);

/**
 * @swagger
 * /api/emprestimos:
 *   post:
 *     summary: Cria um novo empréstimo
 *     tags: [Empréstimos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuarioId:
 *                 type: integer
 *               itemId:
 *                 type: integer
 *     responses:
 *       '201':
 *         description: Criado
 */
router.post('/', emprestimoController.createEmprestimo);

/**
 * @swagger
 * /api/emprestimos/{id}/devolver:
 *   put:
 *     summary: Registra a devolução de um item
 *     tags: [Empréstimos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: OK
 */
router.put('/:id/devolver', emprestimoController.registerDevolucao);


router.get('/', emprestimoController.getAllEmprestimos);

module.exports = router;
