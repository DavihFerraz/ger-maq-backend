const express = require('express');
const router = express.Router();
const emprestimoController = require('../controllers/emprestimoController');
const authMiddleware = require('../middleware/authMiddleware');

// Protege todas as rotas abaixo com autenticação
router.use(authMiddleware);

// Rotas
router.get('/', emprestimoController.getActiveEmprestimos); // GET /api/emprestimos
router.post('/', emprestimoController.createEmprestimo); // POST /api/emprestimos
router.put('/:id/devolver', emprestimoController.registerDevolucao); // PUT /api/emprestimos/:id/devolver

module.exports = router;