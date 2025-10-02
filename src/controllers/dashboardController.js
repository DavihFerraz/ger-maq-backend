const db = require('../config/database');
const ExcelJS = require('exceljs');

// Função interna para buscar todos os dados do dashboard
async function getDashboardData() {
    const [
        resumoGeral,
        emprestimosPorDepto,
        atividadeRecente,
        todosAtivosPorSetor, // Esta consulta será modificada
        ativosPorEstado
    ] = await Promise.all([
        db.query(`
            SELECT 
                i.categoria, 
                COUNT(*) as total, 
                (SELECT COUNT(*) 
                 FROM emprestimos e 
                 JOIN itens_inventario i2 ON e.item_id = i2.id 
                 WHERE i2.categoria = i.categoria AND e.data_devolucao IS NULL) as em_uso 
            FROM itens_inventario i 
            WHERE i.categoria IN ('COMPUTADOR', 'MONITOR', 'MOBILIARIO', 'OUTROS') 
            GROUP BY i.categoria
        `),
        db.query(`
            SELECT 
                split_part(pessoa_depto, ' - ', 2) as departamento, 
                COUNT(*) as total 
            FROM emprestimos 
            WHERE data_devolucao IS NULL AND pessoa_depto LIKE '% - %' 
            GROUP BY departamento 
            ORDER BY total DESC
        `),
        db.query(`
            SELECT 
                e.pessoa_depto, 
                i.modelo_tipo, 
                e.data_emprestimo, 
                e.data_devolucao 
            FROM emprestimos e 
            JOIN itens_inventario i ON e.item_id = i.id 
            ORDER BY GREATEST(e.data_emprestimo, COALESCE(e.data_devolucao, e.data_emprestimo)) DESC 
            LIMIT 5
        `),

        // --- CORREÇÃO PRINCIPAL AQUI ---
        // A consulta agora junta a tabela 'itens_inventario' com a 'setores'
        // e pega o 'nome' do setor em vez de usar a coluna antiga.
        db.query(`
            SELECT 
                i.categoria, 
                s.nome as setor, -- <--- MUDANÇA AQUI
                COUNT(i.id) as quantidade 
            FROM itens_inventario i
            JOIN setores s ON i.setor_id = s.id -- <--- MUDANÇA AQUI
            GROUP BY i.categoria, s.nome 
            ORDER BY i.categoria, s.nome
        `),
        // --- FIM DA CORREÇÃO ---

        db.query(`
            SELECT 
                estado_conservacao, 
                COUNT(*) as quantidade 
            FROM itens_inventario 
            WHERE estado_conservacao IS NOT NULL AND estado_conservacao <> '' 
            GROUP BY estado_conservacao 
            ORDER BY estado_conservacao
        `)
    ]);

    // O resto da função continua igual, pois ela já espera receber o nome do setor
    const resumoComputador = resumoGeral.rows.find(r => r.categoria === 'COMPUTADOR') || { total: 0, em_uso: 0 };
    const resumoMonitor = resumoGeral.rows.find(r => r.categoria === 'MONITOR') || { total: 0, em_uso: 0 };
    const resumoMobiliario = resumoGeral.rows.find(r => r.categoria === 'MOBILIARIO') || { total: 0, em_uso: 0 };
    const resumoOutros = resumoGeral.rows.find(r => r.categoria === 'OUTROS') || { total: 0, em_uso: 0 };

    const ativosPorSetor = todosAtivosPorSetor.rows.filter(item => (item.setor || '').trim().toUpperCase() !== 'UNIDADEDEBENSNAOLOCA');
    const ativosNaoLocalizados = todosAtivosPorSetor.rows.filter(item => (item.setor || '').trim().toUpperCase() === 'UNIDADEDEBENSNAOLOCA');

    return {
        resumoComputadores: { total: parseInt(resumoComputador.total || 0), em_uso: parseInt(resumoComputador.em_uso || 0), disponivel: parseInt(resumoComputador.total || 0) - parseInt(resumoComputador.em_uso || 0) },
        resumoMonitores: { total: parseInt(resumoMonitor.total || 0), em_uso: parseInt(resumoMonitor.em_uso || 0), disponivel: parseInt(resumoMonitor.total || 0) - parseInt(resumoMonitor.em_uso || 0) },
        resumoMobiliario: { total: parseInt(resumoMobiliario.total || 0), em_uso: parseInt(resumoMobiliario.em_uso || 0), disponivel: parseInt(resumoMobiliario.total || 0) - parseInt(resumoMobiliario.em_uso || 0) },
        resumoOutros: { total: parseInt(resumoOutros.total || 0), em_uso: parseInt(resumoOutros.em_uso || 0), disponivel: parseInt(resumoOutros.total || 0) - parseInt(resumoOutros.em_uso || 0) },
        emprestimosPorDepto: emprestimosPorDepto.rows,
        atividadeRecente: atividadeRecente.rows,
        ativosPorSetor: ativosPorSetor,
        ativosNaoLocalizados: ativosNaoLocalizados,
        ativosPorEstado: ativosPorEstado.rows
    };
}

exports.getDashboardStats = async (req, res) => {
    try {
        const dashboardData = await getDashboardData();
        res.status(200).json(dashboardData);
    } catch (error) {
        console.error("Erro ao buscar dados para o dashboard:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar dados para o dashboard." });
    }
};

exports.exportDashboard = async (req, res) => {
    try {
        const data = await getDashboardData();
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Ger-Maq API';

        const resumoSheet = workbook.addWorksheet('Resumo Geral');
        resumoSheet.columns = [
            { header: 'Categoria', key: 'categoria', width: 20 }, { header: 'Total', key: 'total', width: 15 },
            { header: 'Disponível', key: 'disponivel', width: 15 }, { header: 'Em Uso', key: 'em_uso', width: 15 },
        ];
        resumoSheet.getRow(1).font = { bold: true };
        resumoSheet.addRow({ categoria: 'Computadores', ...data.resumoComputadores });
        resumoSheet.addRow({ categoria: 'Monitores', ...data.resumoMonitores });
        resumoSheet.addRow({ categoria: 'Mobiliário', ...data.resumoMobiliario });
        resumoSheet.addRow({ categoria: 'Outros', ...data.resumoOutros });

        const setorSheet = workbook.addWorksheet('Ativos por Setor');
        setorSheet.columns = [ { header: 'Setor', key: 'setor', width: 30 }, { header: 'Categoria', key: 'categoria', width: 20 }, { header: 'Quantidade', key: 'quantidade', width: 15 }, ];
        setorSheet.getRow(1).font = { bold: true };
        setorSheet.addRows(data.ativosPorSetor);

        const naoLocalizadosSheet = workbook.addWorksheet('Ativos Não Localizados');
        naoLocalizadosSheet.columns = [ { header: 'Categoria', key: 'categoria', width: 25 }, { header: 'Quantidade', key: 'quantidade', width: 15 }, ];
        naoLocalizadosSheet.getRow(1).font = { bold: true };
        naoLocalizadosSheet.addRows(data.ativosNaoLocalizados);

        const estadoSheet = workbook.addWorksheet('Ativos por Estado');
        estadoSheet.columns = [ { header: 'Estado de Conservação', key: 'estado_conservacao', width: 30 }, { header: 'Quantidade', key: 'quantidade', width: 15 }, ];
        estadoSheet.getRow(1).font = { bold: true };
        estadoSheet.addRows(data.ativosPorEstado);

        const emprestimoSheet = workbook.addWorksheet('Empréstimos por Depto');
        emprestimoSheet.columns = [ { header: 'Departamento', key: 'departamento', width: 30 }, { header: 'Quantidade de Empréstimos', key: 'total', width: 25 }, ];
        emprestimoSheet.getRow(1).font = { bold: true };
        emprestimoSheet.addRows(data.emprestimosPorDepto);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'Relatorio_Dashboard.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Erro ao gerar o relatório:", error);
        res.status(500).json({ message: "Erro no servidor ao gerar o relatório." });
    }
};