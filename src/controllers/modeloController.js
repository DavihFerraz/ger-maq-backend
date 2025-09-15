// src/controllers/modeloController.js
const db = require('../config/database');

exports.getAllModelos = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM modelos_maquinas ORDER BY nome_modelo');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar modelos." });
    }
};

exports.createModelo = async (req, res) => {
    const { nome_modelo, fabricante, tipo } = req.body;
    try {
        const newModelo = await db.query(
            'INSERT INTO modelos_maquinas (nome_modelo, fabricante, tipo) VALUES ($1, $2, $3) RETURNING *',
            [nome_modelo, fabricante, tipo]
        );
        res.status(201).json(newModelo.rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Erro ao criar modelo." });
    }
};