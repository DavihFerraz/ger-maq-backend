const path = require('path');

// Carrega as variáveis de ambiente corretas com base no NODE_ENV
if (process.env.NODE_ENV === 'development') {
  console.log('A executar em ambiente de DESENVOLVIMENTO...');
  require('dotenv').config({ path: path.resolve(__dirname, '../.env.dev') });
} else {
  console.log('A executar em ambiente de PRODUÇÃO...');
  require('dotenv').config(); // Carrega o ficheiro .env padrão
}

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
const setorRoutes = require('./routes/setorRoutes'); 
const almoxarifadoRoutes = require('./routes/almoxarifadoRoutes'); 
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


// Gera a especificação do Swagger com base nas opções definidas
const swaggerDocs = swaggerjsdoc(swaggerOptions);

app.use(express.json()); // Middleware para o Express interpretar JSON no corpo das requisições
app.use(cors()); // Habilita CORS para todas as rotas

const frontendPath = path.join(__dirname, '..', '..', 'ger-maq-frontend', 'app');
app.use(express.static(frontendPath));




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
app.use('/api/setores', setorRoutes); // Usa as rotas de setores com o prefixo /api/setores
app.use('/api/almoxarifado', almoxarifadoRoutes); // Usa as rotas do almoxarifado com o prefixo /api/almoxarifado

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