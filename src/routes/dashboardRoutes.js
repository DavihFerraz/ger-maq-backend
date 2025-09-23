const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Rota protegida para obter estatísticas do dashboard
router.use(authMiddleware);

router.get('/', dashboardController.getDashboardStats);

module.exports = router;