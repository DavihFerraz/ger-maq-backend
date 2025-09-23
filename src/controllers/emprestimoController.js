// src/controllers/emprestimoController.js
const db = require('../config/database');

// Listar todos os empréstimos ativos (que não foram devolvidos)
exports.getActiveEmprestimos = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT e.id, e.item_id, e.pessoa_depto, e.data_emprestimo, i.patrimonio, i.modelo_tipo 
             FROM emprestimos e
             JOIN itens_inventario i ON e.item_id = i.id
             WHERE e.data_devolucao IS NULL
             ORDER BY e.data_emprestimo DESC`
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar empréstimos." });
    }
};

// Criar um novo emprestimo 
exports.createEmprestimo = async (req, res) => {
    const { item_id, pessoa_depto, monitores_ids } = req.body;
    const registrado_por_id = req.user.id;

    try {
        const newEmprestimo = await db.query(
            `INSERT INTO emprestimos (item_id, pessoa_depto, registrado_por_id, monitores_associados_ids) VALUES ($1, $2, $3, $4) RETURNING *`,
            [item_id, pessoa_depto, registrado_por_id, monitores_ids]
        );

        // Atualiza o status da máquina principal para "Em Uso"
        await db.query(`UPDATE itens_inventario SET status = 'Em Uso' WHERE id = $1`, [item_id]);
        
        // Atualiza também o status dos monitores associados
        if (monitores_ids && monitores_ids.length > 0) {
            await db.query(`UPDATE itens_inventario SET status = 'Em Uso' WHERE id = ANY($1::int[])`, [monitores_ids]);
        }

        res.status(201).json(newEmprestimo.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao registar o empréstimo." });
    }
};

// Registrar a devolução de um item emprestado
exports.registerDevolucao = async (req, res) => {
    const id = parseInt(req.params.id, 10);

    try {
        const emprestimoResult = await db.query(
            `UPDATE emprestimos SET data_devolucao = NOW() WHERE id = $1 RETURNING item_id, monitores_associados_ids`,
            [id]
        );

        if (emprestimoResult.rows.length === 0) {
            return res.status(404).json({ message: "Registo de empréstimo não encontrado." });
        }

        const { item_id, monitores_associados_ids } = emprestimoResult.rows[0];

        // Atualiza o status do item principal de volta para "Disponível"
        await db.query(
            `UPDATE itens_inventario SET status = 'Disponível' WHERE id = $1`,
            [item_id]
        );

        // Se existirem monitores associados, atualiza também o status deles
        if (monitores_associados_ids && monitores_associados_ids.length > 0) {
            await db.query(
                `UPDATE itens_inventario SET status = 'Disponível' WHERE id = ANY($1::int[])`,
                [monitores_associados_ids]
            );
        }

        res.status(200).json({ message: "Devolução registada com sucesso." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao registar a devolução." });
    }
};

// Listar TODO o histórico de empréstimos
exports.getAllEmprestimos = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT 
                e.id, e.item_id, e.pessoa_depto, e.data_emprestimo, e.data_devolucao, 
                i.patrimonio, i.modelo_tipo, i.categoria, u.nome as nome_utilizador
             FROM emprestimos e
             JOIN itens_inventario i ON e.item_id = i.id
             LEFT JOIN usuarios u ON e.registrado_por_id = u.id
             ORDER BY e.data_emprestimo DESC`
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar empréstimos." });
    }
};