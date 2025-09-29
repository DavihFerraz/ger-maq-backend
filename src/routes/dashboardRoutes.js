const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Protege todas as rotas abaixo
router.use(authMiddleware);

// Rota para obter estatísticas (já existente)
router.get('/', dashboardController.getDashboardStats);

// NOVA ROTA para exportar o relatório em Excel
router.get('/export', dashboardController.exportDashboard);

module.exports = router;