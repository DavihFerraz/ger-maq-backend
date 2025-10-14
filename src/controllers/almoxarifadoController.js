// Em /src/controllers/almoxarifadoController.js

const db = require('../config/database');

// Função  para registrar a saída de um item
exports.registrarSaida = async (req, res) => {
    // Adicionamos 'data_prevista_devolucao'
    const { itemId, pessoaNome, setor, quantidade, observacoes, ehDevolucao, data_prevista_devolucao } = req.body;
    const criado_por_id = req.user.id;

    if (!itemId || !quantidade || (!pessoaNome && !setor)) {
        return res.status(400).json({ message: 'Dados insuficientes.' });
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
                const novoSetor = await client.query('INSERT INTO setores (nome) VALUES ($1) RETURNING id', [setor]);
                setorIdParaInserir = novoSetor.rows[0].id;
            }
        }

        const itemResult = await client.query('SELECT quantidade FROM itens_inventario WHERE id = $1 FOR UPDATE', [itemId]);
        if (itemResult.rows.length === 0) { throw new Error('Item não encontrado.'); }

        const estoqueAtual = itemResult.rows[0].quantidade;
        if (estoqueAtual < quantidade) { throw new Error('Quantidade em estoque é insuficiente.'); }
        
        const novoEstoque = estoqueAtual - quantidade;
        await client.query('UPDATE itens_inventario SET quantidade = $1 WHERE id = $2', [novoEstoque, itemId]);

        // Adicionamos a nova coluna ao INSERT
        await client.query(
            `INSERT INTO almoxarifado_movimentacoes 
            (item_id, pessoa_nome, setor_id, quantidade_movimentada, tipo_movimentacao, observacoes, criado_por_id, data_devolucao, data_prevista_devolucao) 
            VALUES ($1, $2, $3, $4, 'SAIDA', $5, $6, $7, $8)`, // Aumenta para $8
            [itemId, pessoaNome, setorIdParaInserir, quantidade, observacoes, criado_por_id, ehDevolucao ? null : new Date(), ehDevolucao ? data_prevista_devolucao : null]
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
    const { movimentacaoId } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const movimentacaoResult = await client.query('SELECT * FROM almoxarifado_movimentacoes WHERE id = $1 FOR UPDATE', [movimentacaoId]);
        if (movimentacaoResult.rows.length === 0) throw new Error('Registro de movimentação não encontrado.');

        const movimentacao = movimentacaoResult.rows[0];
        if (movimentacao.data_devolucao) throw new Error('Este item já foi devolvido.');

        await client.query("UPDATE almoxarifado_movimentacoes SET data_devolucao = NOW(), tipo_movimentacao = 'DEVOLUCAO' WHERE id = $1", [movimentacaoId]);

        // DEVOLVE A QUANTIDADE AO ESTOQUE DO ITEM PRINCIPAL
        await client.query(
            "UPDATE itens_inventario SET quantidade = quantidade + $1 WHERE id = $2",
            [movimentacao.quantidade_movimentada, movimentacao.item_id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Item devolvido com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro em registrarDevolucao:", error.message);
        res.status(500).json({ message: error.message || 'Erro ao processar a devolução.' });
    } finally {
        client.release();
    }
};