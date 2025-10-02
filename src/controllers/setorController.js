// ger-maq-backend/src/controllers/setorController.js
const pool = require('../config/database');

// Obter todos os setores
exports.getAllSetores = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM setores ORDER BY nome ASC');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar setores', error: error.message });
  }
};