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
    const { login, senha } = req.body;
    try {
        const userResult = await db.query(
            "SELECT * FROM usuarios WHERE email = $1 OR nome = $1", 
            [login]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Credenciais inválidas." });
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(senha, user.senha_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Credenciais inválidas." });
        }

        // --- CORREÇÃO AQUI ---
        // Adiciona o 'departamento' ao payload do token
        const payload = { 
            id: user.id, 
            nome: user.nome, 
            permissao: user.permissao,
            departamento: user.departamento // <-- LINHA ADICIONADA
        };
        // --- FIM DA CORREÇÃO ---

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
        res.status(200).json({ message: "Login bem-sucedido!", token: token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro no servidor ao tentar fazer login." });
    }
};

exports.changePassword = async (req, res) => {
    const { id } = req.user; // Pega o ID do utilizador a partir do token JWT
    const { senhaAtual, novaSenha } = req.body;
    try {
        const userResult = await db.query("SELECT * FROM usuarios WHERE id = $1", [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "Utilizador não encontrado." });
        }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(senhaAtual, user.senha_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Palavra-passe atual incorreta." });
        }
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(novaSenha, salt);
        await db.query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [senhaHash, id]);
        res.status(200).json({ message: "Palavra-passe alterada com sucesso." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro no servidor ao tentar alterar a palavra-passe." });
    }
};