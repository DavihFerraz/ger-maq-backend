// Em /src/controllers/almoxarifadoController.js

const db = require('../config/database');

// Função  para registrar a saída de um item
exports.registrarSaida = async (req, res) => {
    // MUDANÇA 1: Renomeamos 'setorId' para 'setor' para refletir que estamos recebendo o NOME.
    const { itemId, pessoaNome, setor, quantidade, observacoes, ehDevolucao } = req.body;
    const criado_por_id = req.user.id;

    if (!itemId || !quantidade || (!pessoaNome && !setor)) {
        return res.status(400).json({ message: 'Dados insuficientes para registrar a saída.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // MUDANÇA 2: Lógica para encontrar o ID do setor a partir do nome recebido.
        let setorIdParaInserir = null; // Começa como nulo
        if (setor) {
            // Procura o ID do setor no banco de dados usando o nome que veio do frontend
            const setorResult = await client.query('SELECT id FROM setores WHERE nome = $1', [setor]);
            
            if (setorResult.rows.length > 0) {
                setorIdParaInserir = setorResult.rows[0].id; // Se encontrou, usa o ID
            } else {
                // Se o setor não foi encontrado, retorna um erro claro.
                throw new Error(`O setor '${setor}' não foi encontrado.`);
            }
        }

        // 1. Verifica o estoque atual do item
        const itemResult = await client.query('SELECT quantidade FROM itens_inventario WHERE id = $1 FOR UPDATE', [itemId]);
        if (itemResult.rows.length === 0) { throw new Error('Item não encontrado.'); }

        const estoqueAtual = itemResult.rows[0].quantidade;
        if (estoqueAtual < quantidade) { throw new Error('Quantidade em estoque é insuficiente.'); }

        // 2. Atualiza a quantidade no inventário
        const novoEstoque = estoqueAtual - quantidade;
        await client.query('UPDATE itens_inventario SET quantidade = $1 WHERE id = $2', [novoEstoque, itemId]);

        // 3. Insere o registro na tabela de movimentações (usando o ID que encontramos)
        await client.query(
            `INSERT INTO almoxarifado_movimentacoes 
            (item_id, pessoa_nome, setor_id, quantidade_movimentada, tipo_movimentacao, observacoes, criado_por_id, data_devolucao) 
            VALUES ($1, $2, $3, $4, 'SAIDA', $5, $6, $7)`,
            // MUDANÇA 3: Usamos a nova variável 'setorIdParaInserir' aqui
            [itemId, pessoaNome, setorIdParaInserir, quantidade, observacoes, criado_por_id, ehDevolucao ? null : new Date()]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Saída registrada com sucesso!', novoEstoque });

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
    res.status(501).json({ message: 'Funcionalidade de devolução ainda não implementada.' });
};