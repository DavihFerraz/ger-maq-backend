const { json } = require('express');
const db = require('../config/database');

// Criar um novo item 
exports.createItem = async (req, res) => {
    const {patrimonio, categoria, modelo_tipo, setor, cadastrado_gpm, espec_processador, espec_ram, espec_armazenamento, observacoes} = req.body;
    const criado_por_id = req.user.id; // Pegamos o ID do usuario que fez o pedido (do nosso middleware de autenticação)

    try {
        const newItem = await db.query(
            `INSERT INTO itens_inventario (patrimonio, categoria, modelo_tipo, setor, cadastrado_gpm, espec_processador, espec_ram, espec_armazenamento, observacoes, criado_por_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [patrimonio, categoria, modelo_tipo, setor, cadastrado_gpm, espec_processador, espec_ram, espec_armazenamento, observacoes, criado_por_id]
        );
        res.status(201).json(newItem.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500),json({message: 'Erro no servidor ao criar item.'});
    }
};

// Listar todos os itens
exports.getAllItems = async(req, res) => {
    try{
        const {rows} = await db.query('SELECT * FROM itens_inventario ORDER BY categoria, modelo_tipo');
        res.status(200).json(rows);
    } catch(error){
        console.error(error);
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
    const {id} = req.params;
    try {
        const deleteOp = await db.query ('DELETE FROM itens_inventario WHERE id = $1', [id]);
        if(deleteOp.rowCount === 0){
            return res.status(404).json({message: 'Item não encontrado.'});
        }
        res.status(200).json({message: 'Item deletado com sucesso.'});

    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Erro ao deletar o item.'});
    }
}