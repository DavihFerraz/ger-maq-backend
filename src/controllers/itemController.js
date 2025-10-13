const { json } = require('express');
const db = require('../config/database');

// Criar um novo item 

exports.createItem = async (req, res) => {
    const {
        patrimonio, categoria, modelo_tipo, setor,
        cadastrado_gpm, observacoes, estado_conservacao,
        espec_processador, espec_ram, espec_armazenamento,
        quantidade // <-- Nova variável
    } = req.body;
    const criado_por_id = req.user.id;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        let setorId;
        const setorExistente = await client.query('SELECT id FROM setores WHERE nome = $1', [setor]);

        if (setorExistente.rows.length > 0) {
            setorId = setorExistente.rows[0].id;
        } else {
            const novoSetor = await client.query('INSERT INTO setores (nome) VALUES ($1) RETURNING id', [setor]);
            setorId = novoSetor.rows[0].id;
        }

        const newItem = await client.query(
            `INSERT INTO itens_inventario (
                patrimonio, categoria, modelo_tipo, setor_id, cadastrado_gpm, observacoes,
                estado_conservacao, criado_por_id, espec_processador, espec_ram, espec_armazenamento,
                quantidade -- <-- Nova coluna
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`, // <-- Aumentar para $12
            [
                patrimonio, categoria, modelo_tipo, setorId, cadastrado_gpm, observacoes,
                estado_conservacao, criado_por_id, espec_processador, espec_ram, espec_armazenamento,
                quantidade // <-- Novo valor
            ]
        );

        await client.query('COMMIT');
        res.status(201).json(newItem.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro em createItem:", error.message);
        if (error.code === '23505') {
            return res.status(409).json({ message: `Item com patrimônio '${patrimonio}' já existe.` });
        }
        res.status(500).json({ message: "Erro ao criar o item." });
    } finally {
        client.release();
    }
};


// Listar todos os itens
exports.getAllItems = async (req, res) => {
    try {
        // A consulta agora faz um LEFT JOIN com a tabela 'setores' para buscar o nome do setor.
        // Usamos LEFT JOIN para garantir que, se um item não tiver setor, ele ainda apareça na lista.
        const { rows } = await db.query(`
            SELECT 
                i.*, 
                s.nome as setor_nome 
            FROM itens_inventario i
            LEFT JOIN setores s ON i.setor_id = s.id
            ORDER BY i.categoria, i.modelo_tipo
        `);

        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor ao buscar itens.' });
    }
};


// Atualizar um item 
exports.updateItem = async (req, res) => {
    const { id } = req.params;
    // Pega todos os campos que podem ser atualizados
    const {
        patrimonio, categoria, modelo_tipo, status, setor, // 'setor' é o NOME
        cadastrado_gpm, espec_processador, espec_ram, espec_armazenamento, observacoes,
        estado_conservacao 
    } = req.body;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        let setorId = null;
        // Se um nome de setor foi enviado, encontra ou cria o seu ID
        if (setor) {
            const setorExistente = await client.query('SELECT id FROM setores WHERE nome = $1', [setor]);
            if (setorExistente.rows.length > 0) {
                setorId = setorExistente.rows[0].id;
            } else {
                const novoSetor = await client.query('INSERT INTO setores (nome) VALUES ($1) RETURNING id', [setor]);
                setorId = novoSetor.rows[0].id;
            }
        }

        // Monta a query de atualização dinamicamente
        const fields = [];
        const values = [];
        let queryIndex = 1;

        if (patrimonio !== undefined) { fields.push(`patrimonio = $${queryIndex++}`); values.push(patrimonio); }
        if (categoria !== undefined) { fields.push(`categoria = $${queryIndex++}`); values.push(categoria); }
        if (modelo_tipo !== undefined) { fields.push(`modelo_tipo = $${queryIndex++}`); values.push(modelo_tipo); }
        if (status !== undefined) { fields.push(`status = $${queryIndex++}`); values.push(status); }
        if (setorId !== null) { fields.push(`setor_id = $${queryIndex++}`); values.push(setorId); }
        if (cadastrado_gpm !== undefined) { fields.push(`cadastrado_gpm = $${queryIndex++}`); values.push(cadastrado_gpm); }
        if (espec_processador !== undefined) { fields.push(`espec_processador = $${queryIndex++}`); values.push(espec_processador); }
        if (espec_ram !== undefined) { fields.push(`espec_ram = $${queryIndex++}`); values.push(espec_ram); }
        if (espec_armazenamento !== undefined) { fields.push(`espec_armazenamento = $${queryIndex++}`); values.push(espec_armazenamento); }
        if (observacoes !== undefined) { fields.push(`observacoes = $${queryIndex++}`); values.push(observacoes); }
        if (estado_conservacao !== undefined) { fields.push(`estado_conservacao = $${queryIndex++}`); values.push(estado_conservacao); } // <-- PROCESSA O NOVO CAMPO

        if (fields.length === 0) {
            return res.status(400).json({ message: "Nenhum campo para atualizar foi fornecido." });
        }

        const query = `UPDATE itens_inventario SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
        values.push(id);

        const updatedItem = await client.query(query, values);

        if (updatedItem.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Item não encontrado." });
        }

        await client.query('COMMIT');
        res.status(200).json(updatedItem.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro ao atualizar o item:", error);
        res.status(500).json({ message: "Erro ao atualizar o item." });
    } finally {
        client.release();
    }
};

// Deletar um item
exports.deleteItem = async (req, res) => {
    const id = parseInt(req.params.id, 10);

    try {
        // 1. VERIFICA PRIMEIRO SE O ITEM TEM ALGUM EMPRÉSTIMO ASSOCIADO (passado ou presente)
        const emprestimosResult = await db.query('SELECT id FROM emprestimos WHERE item_id = $1', [id]);

        // Se a consulta retornar alguma linha, significa que o item tem um histórico
        if (emprestimosResult.rows.length > 0) {
            return res.status(400).json({ message: 'Não é possível excluir este item, pois ele possui um histórico de empréstimos. Considere alterar o seu status para "Inativo".' });
        }

        // 2. SE NÃO HOUVER EMPRÉSTIMOS, AÍ SIM TENTA APAGAR
        const deleteOp = await db.query('DELETE FROM itens_inventario WHERE id = $1', [id]);
        
        if (deleteOp.rowCount === 0) {
            return res.status(404).json({ message: "Item não encontrado." });
        }
        
        res.status(200).json({ message: "Item apagado com sucesso." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro no servidor ao tentar apagar o item." });
    }
};

// Buscar o histórico de empréstimos de um item específico
exports.getItemHistory = async (req, res) => {
    const { id } = req.params; // Pega o ID do item a partir da URL

    try {
        const { rows } = await db.query(
            `SELECT e.pessoa_depto, e.data_emprestimo, e.data_devolucao, u.nome as nome_utilizador
             FROM emprestimos e
             LEFT JOIN usuarios u ON e.registrado_por_id = u.id
             WHERE e.item_id = $1
             ORDER BY e.data_emprestimo DESC`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(200).json([]); // Retorna uma lista vazia se não houver histórico
        }

        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar histórico do item:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar histórico do item." });
    }
};