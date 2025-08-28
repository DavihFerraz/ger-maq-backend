const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Pega o token do cabeçalho Authorization
    const authHeader = req.header('Authorization');
    //  Verifica se o token está presente
    if (!authHeader) {
        return res.status(401).json({message: 'Acesso negado. Token não fornecido.'});
    }

    try{
        // O token geralmente vem no formato "Bearer. Precisamos separar o token do "Bearer"
        const token = authHeader.split(' ')[1];

        if(!token){
            return res.status(401).json({message: 'Formato do token invalido.'});
        }

        // Verifica se o token é válido
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Adiciona o payload do token (que contem as informações do usuário) ao objeto req
        req.user = decoded;

        // Passa para a proxima função (controlador ou próximo middleware)
        next();

    } catch(ex){
        res.status(400).json({message: 'Token inválido.'});
    }
        
}