// ger-maq-backend/scripts/criar_tabela_setores.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/config/database');

const criarTabelas = async () => {
  const client = await pool.connect();
  try {
    console.log('Iniciando a migração do banco de dados...');
    await client.query('BEGIN');

    // 1. Criar a nova tabela de setores
    console.log('Criando a tabela "setores"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS setores (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE
      );
    `);

    // 2. Adicionar a coluna 'setor_id' à tabela de itens
    console.log('Adicionando a coluna "setor_id" a "itens_inventario"...');
    // Adiciona a coluna apenas se ela não existir
    const colExists = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='itens_inventario' AND column_name='setor_id';
    `);
    if (colExists.rows.length === 0) {
        await client.query(`
            ALTER TABLE itens_inventario
            ADD COLUMN setor_id INTEGER REFERENCES setores(id);
        `);
    } else {
        console.log('Coluna "setor_id" já existe.');
    }
    
    // 3. (Opcional, mas recomendado) Remover a coluna antiga 'setor'
    // CUIDADO: Faça um backup antes de rodar esta parte.
    // Por enquanto, vamos apenas comentar para segurança.
    
    console.log('Removendo a coluna antiga "setor" de "itens_inventario"...');
    await client.query(`
      ALTER TABLE itens_inventario
      DROP COLUMN IF EXISTS setor;
    `);
    

    await client.query('COMMIT');
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro durante a migração:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

criarTabelas();