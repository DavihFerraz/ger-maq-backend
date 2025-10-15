// src/controllers/userController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Listar todos os usuários (exceto a senha)
exports.getAllUsers = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, nome, email, departamento, permissao FROM usuarios ORDER BY nome');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar usuários." });
    }
};

// Criar um novo usuário (ação do admin)
exports.createUser = async (req, res) => {
    const { nome, email, senha, departamento, permissao } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const newUser = await db.query(
            "INSERT INTO usuarios (nome, email, senha_hash, departamento, permissao) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, departamento, permissao",
            [nome, email, senhaHash, departamento, permissao]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Violação de unicidade (email duplicado)
            return res.status(409).json({ message: `O email '${email}' já está em uso.` });
        }
        res.status(500).json({ message: "Erro ao criar usuário." });
    }
};

// Atualizar um usuário
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { nome, email, departamento, permissao } = req.body;
    try {
        const updatedUser = await db.query(
            "UPDATE usuarios SET nome = $1, email = $2, departamento = $3, permissao = $4 WHERE id = $5 RETURNING id, nome, email, departamento, permissao",
            [nome, email, departamento, permissao, id]
        );
        if (updatedUser.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(200).json(updatedUser.rows[0]);
    } catch (error) {
         if (error.code === '23505') {
            return res.status(409).json({ message: `O email '${email}' já está em uso.` });
        }
        res.status(500).json({ message: "Erro ao atualizar usuário." });
    }
};

// Deletar um usuário
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
        if (deleteOp.rowCount === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        res.status(200).json({ message: 'Usuário deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: "Erro ao deletar usuário." });
    }
};
