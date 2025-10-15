module.exports = function (req, res, next) {
    // Este middleware deve ser usado DEPOIS do authMiddleware.
    const user = req.user;

    if (!user || (user.permissao !== 'admin' && user.permissao !== 'editor')) {
        return res.status(403).json({ message: 'Acesso negado. Requer permissão de Editor ou Administrador.' });
    }

    // Se o usuário for editor ou admin, permite que a requisição continue.
    next();
};