require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

// Importa o framework Express
const express = require('express');

const swaggerUi = require('swagger-ui-express');
const swaggerjsdoc = require('swagger-jsdoc');

const db = require('./config/database'); // Importa o nosso módulo de banco de dados

// Importações
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const emprestimoRoutes = require('./routes/emprestimoRoutes');
const modeloRoutes = require('./routes/modeloRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cors = require('cors');

// Criar uma instancia do Express
const app = express();

// Define a porta em que o servidor irá rodar
const PORT = process.env.PORT || 3000;

// Configuração do Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gerenciador de Ativos',
      version: '1.0.0',
      description: 'Documentação da API',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
    // As tags ainda são úteis para organizar
    tags: [
      { name: 'Autenticação' },
      { name: 'Itens' },
      { name: 'Empréstimos' },
    ],
  },
  apis: ['./src/routes/*.js'],
};
const corsOptions = {
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // Adicione aqui os endereços do seu frontend
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};


// Gera a especificação do Swagger com base nas opções definidas
const swaggerDocs = swaggerjsdoc(swaggerOptions);

app.use(express.json()); // Middleware para o Express interpretar JSON no corpo das requisições
app.use(cors(corsOptions)); // Habilita CORS para todas as rotas


// Cria uma rota de teste
app.get('/', (req, res) => {
  res.send('API Ger-Maq está funcionando!');
});    

// Rotas
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs)); // Rota para a documentação do Swagger

app.use('/api/auth', authRoutes); // Usa as rotas de autenticação com o prefixo /api/auth
app.use('/api/itens', itemRoutes); // Usa as rotas de itens com o prefix
app.use('/api/emprestimos', emprestimoRoutes); // Usa as rotas de empréstimos com o prefixo /api/emprestimos
app.use('/api/modelos', modeloRoutes); // Usa as rotas de modelos com o prefixo /api/modelos
app.use('/api/dashboard', dashboardRoutes); // Usa as rotas do dashboard com o prefixo /api/dashboard

// Inicia o servidor e escuta na porta definida
app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Documentação da API disponível em http://localhost:${PORT}/api-docs`); // Mensagem útil no terminal

  try {
    const result = await db.query('SELECT NOW()'); // Faz uma consulta simples para pegar a hora atual do BD
    console.log('Conexão com o banco de dados estabelecida com sucesso:', result.rows[0].now);
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
  }
});