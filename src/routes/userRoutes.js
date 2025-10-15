// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Aplica a autenticação e a verificação de admin a TODAS as rotas deste arquivo
router.use(authMiddleware);
router.use(adminMiddleware);

// Rota para listar todos os usuários
router.get('/', userController.getAllUsers);

// Rota para criar um novo usuário (função de admin)
router.post('/', userController.createUser);

// Rota para atualizar um usuário
router.put('/:id', userController.updateUser);

// Rota para deletar um usuário
router.delete('/:id', userController.deleteUser);

module.exports = router;
