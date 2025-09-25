const { json } = require('express');
const db = require('../config/database');

// Criar um novo item 

exports.createItem = async (req, res) => {
  // ATUALIZADO: Remove 'classe' da desestruturação, pois não virá mais do frontend
  const { patrimonio, categoria, modelo_tipo, setor, cadastrado_gpm, observacoes, estado_conservacao } = req.body;
  const criado_por_id = req.user.id;

  try {
    // A query agora tem um campo a menos para preencher ($8 em vez de $9)
    const newItem = await db.query(
      `INSERT INTO itens_inventario (patrimonio, categoria, modelo_tipo, setor, cadastrado_gpm, observacoes, classe, estado_conservacao, criado_por_id)
       VALUES ($1, $2, $3, $4, $5, $6, $2, $7, $8) RETURNING *`, // A 'classe' agora usa o valor de 'categoria' ($2)
      [patrimonio, categoria, modelo_tipo, setor, cadastrado_gpm, observacoes, estado_conservacao, criado_por_id] // O array de valores também foi ajustado
    );
    res.status(201).json(newItem.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar o item." });
  }
};

// Listar todos os itens
exports.getAllItems = async(req, res) => {
    // bloco try-catch para lidar com erros de banco de dados
    try{
        const {rows} = await db.query('SELECT * FROM itens_inventario ORDER BY categoria, modelo_tipo');
        // resposta de sucesso com os itens em formato JSON
        res.status(200).json(rows);
    } catch(error){
        console.error(error);
        // resposta de erro em caso de falha na consulta
        res.status(500).json({message: 'Erro no servidor ao buscar itens.'});
    }
}

// Atualizar um item 
exports.updateItem = async (req, res) => {
    const { id } = req.params;
    const { 
        patrimonio, categoria, modelo_tipo, status, setor, cadastrado_gpm, 
        espec_processador, espec_ram, espec_armazenamento, observacoes 
    } = req.body;

    try {
        const updatedItem = await db.query(
            `UPDATE itens_inventario SET 
                patrimonio = COALESCE($1, patrimonio), 
                categoria = COALESCE($2, categoria), 
                modelo_tipo = COALESCE($3, modelo_tipo), 
                status = COALESCE($4, status), 
                setor = COALESCE($5, setor), 
                cadastrado_gpm = COALESCE($6, cadastrado_gpm), 
                espec_processador = COALESCE($7, espec_processador), 
                espec_ram = COALESCE($8, espec_ram), 
                espec_armazenamento = COALESCE($9, espec_armazenamento), 
                observacoes = COALESCE($10, observacoes)
             WHERE id = $11 RETURNING *`,
            [
                patrimonio, categoria, modelo_tipo, status, setor, cadastrado_gpm,
                espec_processador, espec_ram, espec_armazenamento, observacoes, id
            ]
        );

        if (updatedItem.rows.length === 0) {
            return res.status(404).json({ message: "Item não encontrado." });
        }
        res.status(200).json(updatedItem.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao atualizar o item." });
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