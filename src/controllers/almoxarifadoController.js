// Em /src/controllers/almoxarifadoController.js

const db = require('../config/database');
const pool = require('../config/database');



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

exports.createAlmoxarifadoItem = async (req, res) => {
    // Dados virão do FormData
    const { modelo_tipo, patrimonio, quantidade, observacoes, setor } = req.body;

    const client = await pool.connect();

    try {
        // Inicia a transação
        await client.query('BEGIN');

        // 1. Insere o item na tabela principal 'itens_inventario'
        const itemQuery = `
            INSERT INTO itens_inventario 
            (categoria, modelo_tipo, patrimonio, quantidade, observacoes, setor_id, status)
            VALUES ($1, $2, $3, $4, $5, (SELECT id FROM setores WHERE nome = $6), $7)
            RETURNING id;
        `;
        const itemValues = [
            'ALMOXARIFADO',
            modelo_tipo,
            patrimonio || null,
            parseInt(quantidade, 10),
            observacoes || null,
            setor || 'Almoxarifado', // Define um padrão se não for enviado
            'Disponível'
        ];

        const result = await client.query(itemQuery, itemValues);
        const newItemId = result.rows[0].id;

        // 2. Se houver arquivos (req.files), insere na tabela 'anexos_itens'
        if (req.files && req.files.length > 0) {
            const anexoQuery = 'INSERT INTO anexos_itens (item_id, nome_arquivo, caminho_arquivo) VALUES ($1, $2, $3)';
            for (const file of req.files) {
                // file.path é onde o multer salvou o arquivo (ex: "uploads/anexos-12345.pdf")
                const anexoValues = [newItemId, file.originalname, file.path];
                await client.query(anexoQuery, anexoValues);
            }
        }

        // Confirma a transação
        await client.query('COMMIT');
        res.status(201).json({ message: 'Item de almoxarifado criado com sucesso!', id: newItemId });

    } catch (error) {
        // Desfaz a transação em caso de erro
        await client.query('ROLLBACK');
        console.error('Erro ao criar item de almoxarifado:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        // Libera a conexão
        client.release();
    }
};


exports.getAnexosItem = async (req, res) => {
    const { id } = req.params; // Pega o ID do item da URL
    try {
        const query = 'SELECT id, nome_arquivo, caminho_arquivo FROM anexos_itens WHERE item_id = $1 ORDER BY data_upload DESC';
        const { rows } = await pool.query(query, [id]);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao buscar anexos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};