const db = require('../config/database');

// Listar todos os empréstimos ativos (que não foram devolvidos)
exports.getActiveEmprestimos = async (req, res) => {
    try{
        const {rows} = await db.query(
            `SELECT e.id, e.pessoa_depto, e.data_emprestimo, i.patrimonio, i.modelo_tipo
            FROM emprestimos e
            JOIN itens_inventario i ON e.item_id = i.id
            WHERE e.data_devolucao IS NULL
            ORDER BY e.data_emprestimo DESC`
        );
        res.status(200).json(rows);

    }catch (error) {
        console.error('Erro ao buscar empréstimos ativos:', error);
        res.status(500).json({ error: 'Erro ao buscar empréstimos ativos' });
    }
};

// Criar um novo emprestimo 
exports.createEmprestimo = async (req, res) => {
    const {item_id, pessoa_depto} = req.body;
    const registrado_por_id = req.user.id; // Supondo que o ID do usuário autenticado esteja disponível em req.user.id

    try{
        // Passo 1: Inserir o novo registro na tabela de empréstimos
        const newEmprestimo = await db.query(
            `INSERT INTO emprestimos (item_id, pessoa_depto, registrado_por_id) VALUES ($1, $2, $3) RETURNING *`,
            [item_id, pessoa_depto, registrado_por_id]
        );

        // Passo 2: Atualizar o status do item no inventário para "Em uso"
        await db.query(
            `UPDATE itens_inventario SET status = 'Em uso' WHERE id = $1`,
            [item_id]
        );

        res.status(201).json(newEmprestimo.rows[0]);

    } catch(error){
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar empréstimo' });
    }
};

// Registrar a devolução de um item emprestado
exports.registerDevolucao = async (req, res) => {
    // Pega o ID da URL e converte para inteiro
    const emprestimo_id = parseInt(req.params.id, 10) // ID do empréstimo a ser devolvido

    // Adicionar uma validação para garantir que o ID é um número válido
    if (isNaN(emprestimo_id)) {
        return res.status(400).json({ error: 'ID de empréstimo inválido' });
    }

    try{
        // Passo 1: Atualizar o registro de emprestimo com a data de devolução
        const emprestimoResult = await db.query(
            `UPDATE emprestimos SET data_devolucao = NOW() WHERE id = $1 RETURNING *`,
            [emprestimo_id]
        );
        if (emprestimoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado' });
        }

        const {item_id} = emprestimoResult.rows[0];

        // Passo 2: Atualizar o status do item no inventário para "Disponível"
        await db.query(
            `UPDATE itens_inventario SET status = 'Disponível' WHERE id = $1`,
            [item_id]
        );

        res.status(200).json({ message: 'Devolução registrada com sucesso' });

    } catch(error){
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar devolução' });
    }
};