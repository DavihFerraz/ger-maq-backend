// ger-maq-backend/src/routes/setorRoutes.js
const express = require('express');
const router = express.Router();
const setorController = require('../controllers/setorController');
const authMiddleware = require('../middleware/authMiddleware');
const editorMiddleware = require('../middleware/editorMiddleware');


// Rota para buscar todos os setores (protegida por autenticação)
router.get('/', authMiddleware, setorController.getAllSetores);

module.exports = router;