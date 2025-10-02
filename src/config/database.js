// Importa a biblioteca dotenv para carregar variáveis de ambiente

// Importa a classe Pool da biblioteca "pg" para gerenciar conexões com o PostgreSQL
const { Pool } = require('pg');

// Cria uma nova instância de Pool com as configurações do banco de dados
// O constructor Pool vai ler automaticamente as variáveis de ambiente

const pool = new Pool({
  user: process.env.DB_USER,         // Usuário do banco de dados
  host: process.env.DB_HOST,         // Host do banco de dados
  database: process.env.DB_DATABASE,     // Nome do banco de dados
  password: process.env.DB_PASSWORD, // Senha do banco de dados
  port: process.env.DB_PORT,         // Porta do banco de dados
});

// Exportamos um objeto com o metodo query para executar consultas SQL
// que executa uma consulta usando o pool de conexões
module.exports = pool;
