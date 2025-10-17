module.exports = function (req, res, next) {
    const user = req.user;

    // Verifica se o usuário existe na requisição
    if (!user || !user.permissao) {
        return res.status(403).json({ message: 'Acesso negado. Permissão de usuário não encontrada.' });
    }

    // --- LÓGICA CORRIGIDA ---
    // Converte a permissão do usuário para minúsculas antes de comparar
    const permissao = user.permissao.toLowerCase();

    if (permissao !== 'admin' && permissao !== 'editor') {
        return res.status(403).json({ message: 'Acesso negado. Requer permissão de Editor ou Administrador.' });
    }

    // Se o usuário for editor ou admin, permite que a requisição continue.
    next();
};