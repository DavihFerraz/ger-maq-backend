require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

// Importa o framework Express
const express = require('express');
const db = require('./config/database'); // Importa o nosso módulo de banco de dados

// Importações
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');

// Criar uma instancia do Express
const app = express();

// Define a porta em que o servidor irá rodar
const PORT = 3000;

app.use(express.json()); // Middleware para o Express interpretar JSON no corpo das requisições


// Cria uma rota de teste
app.get('/', (req, res) => {
  res.send('API Ger-Maq está funcionando!');
});    

// Rotas
app.use('/api/auth', authRoutes); // Usa as rotas de autenticação com o prefixo /api/auth
app.use('/api/itens', itemRoutes); // Usa as rotas de itens com o prefix

// Inicia o servidor e escuta na porta definida
app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);

  try {
    const result = await db.query('SELECT NOW()'); // Faz uma consulta simples para pegar a hora atual do BD
    console.log('Conexão com o banco de dados estabelecida com sucesso:', result.rows[0].now);
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
  }
});