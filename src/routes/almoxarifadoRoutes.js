const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const almoxarifadoController = require('../controllers/almoxarifadoController');
const editorMiddleware = require('../middleware/editorMiddleware');


// Rota para registrar uma nova saída de item do almoxarifado
router.post('/saida', editorMiddleware, almoxarifadoController.registrarSaida);

// Rota para registrar a devolução de um item
router.post('/devolucao/:movimentacaoId', editorMiddleware, almoxarifadoController.registrarDevolucao);

// Rota para buscar o histórico de movimentações de um item específico
router.get('/historico/:itemId', authMiddleware, almoxarifadoController.getHistoricoItem);

module.exports = router;