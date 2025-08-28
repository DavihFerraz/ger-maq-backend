// src/routes/itemRoutes.js
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const authMiddleware = require('../middleware/authMiddleware'); // <-- Importamos o nosso guarda

// Aplicamos o middleware de autenticação a todas as rotas abaixo
router.use(authMiddleware);

// Rotas CRUD para itens
router.post('/', itemController.createItem); // Criar um novo item
router.get('/', itemController.getAllItems); // Listar todos os itens
router.put('/:id', itemController.updateItem); // Atualizar um item pelo ID
router.delete('/:id', itemController.deleteItem); // Deletar um item pelo ID

module.exports = router;