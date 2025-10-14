// Em /src/controllers/almoxarifadoController.js

const db = require('../config/database');

// Função  para registrar a saída de um item
exports.registrarSaida = async (req, res) => {
    const { itemId, pessoaNome, setor, quantidade, observacoes, ehDevolucao } = req.body;
    const criado_por_id = req.user.id;

    if (!itemId || !quantidade || (!pessoaNome && !setor)) {
        return res.status(400).json({ message: 'Dados insuficientes para registrar a saída.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        let setorIdParaInserir = null;
        if (setor) {
            const setorResult = await client.query('SELECT id FROM setores WHERE nome = $1', [setor]);
            if (setorResult.rows.length > 0) {
                setorIdParaInserir = setorResult.rows[0].id;
            } else {
                throw new Error(`O setor '${setor}' não foi encontrado.`);
            }
        }

        const itemResult = await client.query('SELECT quantidade, status FROM itens_inventario WHERE id = $1 FOR UPDATE', [itemId]);
        if (itemResult.rows.length === 0) { throw new Error('Item não encontrado.'); }

        const { quantidade: estoqueAtual, status: statusAtual } = itemResult.rows[0];

        // --- LÓGICA PRINCIPAL ALTERADA AQUI ---
        if (ehDevolucao) {
            // Se for um item para DEVOLUÇÃO (EMPRÉSTIMO)
            if (statusAtual !== 'Disponível') {
                throw new Error('Este item não está disponível para empréstimo.');
            }
            // Altera o status para 'Em Empréstimo'
            await client.query(`UPDATE itens_inventario SET status = 'Em Empréstimo' WHERE id = $1`, [itemId]);
        } else {
            // Se for um item de CONSUMO (lógica antiga)
            if (estoqueAtual < quantidade) {
                throw new Error('Quantidade em estoque é insuficiente.');
            }
            const novoEstoque = estoqueAtual - quantidade;
            await client.query('UPDATE itens_inventario SET quantidade = $1 WHERE id = $2', [novoEstoque, itemId]);
        }

        await client.query(
            `INSERT INTO almoxarifado_movimentacoes 
            (item_id, pessoa_nome, setor_id, quantidade_movimentada, tipo_movimentacao, observacoes, criado_por_id, data_devolucao) 
            VALUES ($1, $2, $3, $4, 'SAIDA', $5, $6, $7)`,
            [itemId, pessoaNome, setorIdParaInserir, quantidade, observacoes, criado_por_id, ehDevolucao ? null : new Date()]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Saída registrada com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro em registrarSaida:", error.message);
        res.status(500).json({ message: error.message || "Erro interno ao registrar a saída." });
    } finally {
        client.release();
    }
};


// Função  para buscar o histórico de um item
exports.getHistoricoItem = async (req, res) => {
    const { itemId } = req.params;
    try {
        const result = await db.query(
            `SELECT 
                am.*, 
                s.nome AS setor_nome,
                u.nome AS usuario_nome
            FROM almoxarifado_movimentacoes am
            LEFT JOIN setores s ON am.setor_id = s.id
            LEFT JOIN usuarios u ON am.criado_por_id = u.id
            WHERE am.item_id = $1 
            ORDER BY am.data_movimentacao DESC`,
            [itemId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Erro em getHistoricoItem:", error.message);
        res.status(500).json({ message: "Erro ao buscar histórico." });
    }
};


exports.registrarDevolucao = async (req, res) => {
    // O ID que vem na URL é o ID da MOVIMENTAÇÃO de saída
    const { movimentacaoId } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Encontra a movimentação de saída original
        const movimentacaoResult = await client.query(
            'SELECT * FROM almoxarifado_movimentacoes WHERE id = $1 FOR UPDATE',
            [movimentacaoId]
        );

        if (movimentacaoResult.rows.length === 0) {
            throw new Error('Registro de movimentação não encontrado.');
        }

        const movimentacao = movimentacaoResult.rows[0];

        // 2. Verifica se o item já não foi devolvido
        if (movimentacao.data_devolucao) {
            throw new Error('Este item já foi devolvido anteriormente.');
        }

        // 3. Atualiza o registro de movimentação, adicionando a data de devolução
        await client.query(
            "UPDATE almoxarifado_movimentacoes SET data_devolucao = NOW(), tipo_movimentacao = 'DEVOLUCAO' WHERE id = $1",
            [movimentacaoId]
        );

        // 4. Atualiza o status do item no inventário principal para 'Disponível'
        await client.query(
            "UPDATE itens_inventario SET status = 'Disponível' WHERE id = $1",
            [movimentacao.item_id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Item devolvido com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro em registrarDevolucao:", error.message);
        res.status(500).json({ message: error.message || 'Erro interno ao processar a devolução.' });
    } finally {
        client.release();
    }
};