module.exports = function (req, res, next) {
    // Este middleware deve ser usado DEPOIS do authMiddleware,
    // pois ele depende do req.user que o authMiddleware cria.

    if (!req.user || req.user.permissao !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
    }

    // Se o usuário for um admin, permite que a requisição continue.
    next();
};
