const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const almoxarifadoController = require('../controllers/almoxarifadoController');
const editorMiddleware = require('../middleware/editorMiddleware');
const upload = require('../middleware/uploadMiddleware');


// Rota para registrar uma nova saída de item do almoxarifado
router.post('/saida',authMiddleware, editorMiddleware, almoxarifadoController.registrarSaida);

// Rota para registrar a devolução de um item
router.post('/devolucao/:movimentacaoId', authMiddleware, editorMiddleware, almoxarifadoController.registrarDevolucao);

router.post(
    '/', 
    authMiddleware, 
    editorMiddleware, 
    upload.array('anexos', 5), 
    almoxarifadoController.createAlmoxarifadoItem
);

router.get(
    '/:id/anexos', 
    authMiddleware, 
    almoxarifadoController.getAnexosItem
);

// Rota para buscar o histórico de movimentações de um item específico
router.get('/historico/:itemId', authMiddleware, almoxarifadoController.getHistoricoItem);

module.exports = router;