const db = require('../config/database');

exports.getDashboardStats = async (req, res) => {
    try {
        const [totalAtivosResult, totalEmUsoResult, emprestimosPorDepto, atividadeRecente] = await Promise.all([
            // Consulta 1: Pega o total de ativos. Esta é a forma correta de verificar o total.
            db.query(`SELECT COUNT(*) AS total FROM itens_inventario`),
            
            // Consulta 2: Pega o total "Em Uso" da fonte da verdade: a tabela de empréstimos.
            db.query(`SELECT COUNT(*) AS em_uso FROM emprestimos WHERE data_devolucao IS NULL`),

            // Consulta 3: Agrupa empréstimos ativos por departamento
            db.query(`
                SELECT 
                    split_part(pessoa_depto, ' - ', 2) as departamento, 
                    COUNT(*) as total 
                FROM emprestimos 
                WHERE data_devolucao IS NULL AND pessoa_depto LIKE '% - %'
                GROUP BY departamento 
                ORDER BY total DESC
            `),
            
            // Consulta 4: Pega os 5 empréstimos mais recentes
            db.query(`
                SELECT 
                    e.pessoa_depto, i.modelo_tipo, e.data_emprestimo, e.data_devolucao
                FROM emprestimos e
                JOIN itens_inventario i ON e.item_id = i.id
                ORDER BY GREATEST(e.data_emprestimo, e.data_devolucao) DESC
                LIMIT 5
            `)
        ]);

        const totalAtivos = parseInt(totalAtivosResult.rows[0].total, 10);
        const totalEmUso = parseInt(totalEmUsoResult.rows[0].em_uso, 10);

        // Calcula o "Disponível" com base nos outros dois valores
        const totalDisponivel = totalAtivos - totalEmUso;

        const dashboardData = {
            kpis: {
                total: totalAtivos,
                disponivel: totalDisponivel,
                em_uso: totalEmUso
            },
            emprestimosPorDepto: emprestimosPorDepto.rows,
            atividadeRecente: atividadeRecente.rows,
        };

        res.status(200).json(dashboardData);

    } catch (error) {
        console.error("Erro ao buscar dados para o dashboard:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar dados para o dashboard." });
    }
};