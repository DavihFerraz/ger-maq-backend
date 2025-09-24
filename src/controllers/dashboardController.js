// src/controllers/dashboardController.js
const db = require('../config/database');

exports.getDashboardStats = async (req, res) => {
    try {
        const [
            resumoGeral,
            emprestimosPorDepto,
            atividadeRecente,
            ativosPorSetor
        ] = await Promise.all([
            // Consulta 1: ATUALIZADA para incluir 'OUTROS'
            db.query(`
                SELECT 
                    categoria, 
                    COUNT(*) as total,
                    (SELECT COUNT(*) FROM emprestimos e JOIN itens_inventario i2 ON e.item_id = i2.id WHERE i2.categoria = i.categoria AND e.data_devolucao IS NULL) as em_uso
                FROM itens_inventario i
                WHERE categoria IN ('COMPUTADOR', 'MOBILIARIO', 'OUTROS')
                GROUP BY categoria
            `),

            db.query(`
                SELECT split_part(pessoa_depto, ' - ', 2) as departamento, COUNT(*) as total 
                FROM emprestimos WHERE data_devolucao IS NULL AND pessoa_depto LIKE '% - %'
                GROUP BY departamento ORDER BY total DESC
            `),
            db.query(`
                SELECT e.pessoa_depto, i.modelo_tipo, e.data_emprestimo, e.data_devolucao
                FROM emprestimos e JOIN itens_inventario i ON e.item_id = i.id
                ORDER BY GREATEST(e.data_emprestimo, e.data_devolucao) DESC LIMIT 5
            `),
            db.query(`
                SELECT categoria, setor, COUNT(*) as quantidade
                FROM itens_inventario
                WHERE setor IS NOT NULL AND setor <> ''
                GROUP BY categoria, setor
                ORDER BY categoria, setor
            `)
        ]);

        // Processa os dados, agora incluindo a categoria 'OUTROS'
        const resumoMaquinas = resumoGeral.rows.find(r => r.categoria === 'COMPUTADOR') || { total: 0, em_uso: 0 };
        const resumoMobiliario = resumoGeral.rows.find(r => r.categoria === 'MOBILIARIO') || { total: 0, em_uso: 0 };
        const resumoOutros = resumoGeral.rows.find(r => r.categoria === 'OUTROS') || { total: 0, em_uso: 0 };

        const dashboardData = {
            resumoMaquinas: {
                total: parseInt(resumoMaquinas.total),
                em_uso: parseInt(resumoMaquinas.em_uso),
                disponivel: parseInt(resumoMaquinas.total) - parseInt(resumoMaquinas.em_uso)
            },
            resumoMobiliario: {
                total: parseInt(resumoMobiliario.total),
                em_uso: parseInt(resumoMobiliario.em_uso),
                disponivel: parseInt(resumoMobiliario.total) - parseInt(resumoMobiliario.em_uso)
            },
            // NOVO: Adiciona o resumo de "OUTROS" à resposta
            resumoOutros: {
                total: parseInt(resumoOutros.total),
                em_uso: parseInt(resumoOutros.em_uso),
                disponivel: parseInt(resumoOutros.total) - parseInt(resumoOutros.em_uso)
            },
            emprestimosPorDepto: emprestimosPorDepto.rows,
            atividadeRecente: atividadeRecente.rows,
            ativosPorSetor: ativosPorSetor.rows
        };

        res.status(200).json(dashboardData);

    } catch (error) {
        console.error("Erro ao buscar dados para o dashboard:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar dados para o dashboard." });
    }
};