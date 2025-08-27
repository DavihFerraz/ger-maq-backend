const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Função para registrar um novo usuário
exports.register = async (req, res) => {
    const {nome, email, senha, departamento, permissao} = req.body;

    try{
        // Criptografar a senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Inserir o novo usuário no banco de dados
        const newUser = await db.query(
            "INSERT INTO usuarios (nome, email, senha_hash, departamento, permissao) VALUES ($1, $2, $3, $4, $5) RETURNING id, email",
            [nome, email,senhaHash, departamento, permissao || 'leitor']
        );

        res.status(201).json({message: 'Usuário registrado com sucesso', user: newUser.rows[0]});
    }   catch(error){
        console.error(error);
        res.status(500).json({message: 'Erro no servidor ao registrar usuário'});
    }
};

// Funçao para fazer login
exports.login = async (req, res) => {
    const {email, senha} = req.body;

    try{
        // Procura o usuário pelo email
        const userResult = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);

        if (userResult.rows.length === 0){
            return res.status(401).json({message: 'Credenciais inválidas'});
        }

        const user = userResult.rows[0];

        //Compara a senha fornecida com a senha armazenada
        const isMatch = await bcrypt.compare(senha, user.senha_hash);

        if(!isMatch){
            return res.status(401).json({message: 'Credenciais inválidas'});
        }

        // Se as credenciais forem válidas, gera um token JWT
        const payload = {
            id: user.id,
            nome: user.nome,
            permissao: user.permissao
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Uma chave secreta para assinar o token
            {expiresIn: '24h'} // O token expira em 24 hora
        );

        res.status(200).json({message: 'Login bem-sucedido', token});

    }   catch(error){
        console.error(error);
        res.status(500).json({message: 'Erro no servidor ao fazer login'});
    }
}