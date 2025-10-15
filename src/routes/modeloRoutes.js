// src/routes/modeloRoutes.js
const express = require('express');
const router = express.Router();
const modeloController = require('../controllers/modeloController');
const authMiddleware = require('../middleware/authMiddleware');
const editorMiddleware = require('../middleware/editorMiddleware');


router.use(authMiddleware); // Protege as rotas

router.get('/', modeloController.getAllModelos);
router.post('/', editorMiddleware, modeloController.createModelo);

module.exports = router;