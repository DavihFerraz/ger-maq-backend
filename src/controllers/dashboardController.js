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
            // Consulta 1: Traz os resumos de totais e em uso, agrupados por categoria
            db.query(`
                SELECT 
                    categoria, 
                    COUNT(*) as total,
                    (SELECT COUNT(*) FROM emprestimos e JOIN itens_inventario i2 ON e.item_id = i2.id WHERE i2.categoria = i.categoria AND e.data_devolucao IS NULL) as em_uso
                FROM itens_inventario i
                WHERE categoria IN ('COMPUTADOR', 'MOBILIARIO')
                GROUP BY categoria
            `),
            // Consulta 2: (sem alterações) Agrupa empréstimos ativos por departamento
            db.query(`
                SELECT split_part(pessoa_depto, ' - ', 2) as departamento, COUNT(*) as total 
                FROM emprestimos WHERE data_devolucao IS NULL AND pessoa_depto LIKE '% - %'
                GROUP BY departamento ORDER BY total DESC
            `),
            // Consulta 3: (sem alterações) Pega os 5 empréstimos mais recentes
            db.query(`
                SELECT e.pessoa_depto, i.modelo_tipo, e.data_emprestimo, e.data_devolucao
                FROM emprestimos e JOIN itens_inventario i ON e.item_id = i.id
                ORDER BY GREATEST(e.data_emprestimo, e.data_devolucao) DESC LIMIT 5
            `),
            // Consulta 4: NOVO - Agrupa todos os ativos por categoria e setor
            db.query(`
                SELECT categoria, setor, COUNT(*) as quantidade
                FROM itens_inventario
                WHERE setor IS NOT NULL AND setor <> ''
                GROUP BY categoria, setor
                ORDER BY categoria, setor
            `)
        ]);

        // Processa os dados para o formato que o frontend espera
        const resumoMaquinas = resumoGeral.rows.find(r => r.categoria === 'COMPUTADOR') || { total: 0, em_uso: 0 };
        const resumoMobiliario = resumoGeral.rows.find(r => r.categoria === 'MOBILIARIO') || { total: 0, em_uso: 0 };

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