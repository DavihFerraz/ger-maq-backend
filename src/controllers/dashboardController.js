const db = require('../config/database');
const ExcelJS = require('exceljs');

// Função interna para buscar todos os dados do dashboard
async function getDashboardData() {
    const [
        resumoGeral,
        emprestimosPorDepto,
        atividadeRecente,
        todosAtivosPorSetor,
        ativosPorEstado
    ] = await Promise.all([
        db.query(`SELECT categoria, COUNT(*) as total, (SELECT COUNT(*) FROM emprestimos e JOIN itens_inventario i2 ON e.item_id = i2.id WHERE i2.categoria = i.categoria AND e.data_devolucao IS NULL) as em_uso FROM itens_inventario i WHERE categoria IN ('COMPUTADOR', 'MOBILIARIO', 'OUTROS') GROUP BY categoria`),
        db.query(`SELECT split_part(pessoa_depto, ' - ', 2) as departamento, COUNT(*) as total FROM emprestimos WHERE data_devolucao IS NULL AND pessoa_depto LIKE '% - %' GROUP BY departamento ORDER BY total DESC`),
        db.query(`SELECT e.pessoa_depto, i.modelo_tipo, e.data_emprestimo, e.data_devolucao FROM emprestimos e JOIN itens_inventario i ON e.item_id = i.id ORDER BY GREATEST(e.data_emprestimo, e.data_devolucao) DESC LIMIT 5`),
        db.query(`SELECT categoria, setor, COUNT(*) as quantidade FROM itens_inventario WHERE setor IS NOT NULL AND setor <> '' GROUP BY categoria, setor ORDER BY categoria, setor`),
        db.query(`SELECT estado_conservacao, COUNT(*) as quantidade FROM itens_inventario WHERE estado_conservacao IS NOT NULL AND estado_conservacao <> '' GROUP BY estado_conservacao ORDER BY estado_conservacao`)
    ]);

    const resumoMaquinas = resumoGeral.rows.find(r => r.categoria === 'COMPUTADOR') || { total: 0, em_uso: 0 };
    const resumoMobiliario = resumoGeral.rows.find(r => r.categoria === 'MOBILIARIO') || { total: 0, em_uso: 0 };
    const resumoOutros = resumoGeral.rows.find(r => r.categoria === 'OUTROS') || { total: 0, em_uso: 0 };

    const ativosPorSetor = todosAtivosPorSetor.rows.filter(item => (item.setor || '').trim().toUpperCase() !== 'UNIDADEDEBENSNAOLOCA');
    const ativosNaoLocalizados = todosAtivosPorSetor.rows.filter(item => (item.setor || '').trim().toUpperCase() === 'UNIDADEDEBENSNAOLOCA');

    return {
        resumoMaquinas: { total: parseInt(resumoMaquinas.total), em_uso: parseInt(resumoMaquinas.em_uso), disponivel: parseInt(resumoMaquinas.total) - parseInt(resumoMaquinas.em_uso) },
        resumoMobiliario: { total: parseInt(resumoMobiliario.total), em_uso: parseInt(resumoMobiliario.em_uso), disponivel: parseInt(resumoMobiliario.total) - parseInt(resumoMobiliario.em_uso) },
        resumoOutros: { total: parseInt(resumoOutros.total), em_uso: parseInt(resumoOutros.em_uso), disponivel: parseInt(resumoOutros.total) - parseInt(resumoOutros.em_uso) },
        emprestimosPorDepto: emprestimosPorDepto.rows,
        atividadeRecente: atividadeRecente.rows,
        ativosPorSetor: ativosPorSetor,
        ativosNaoLocalizados: ativosNaoLocalizados,
        ativosPorEstado: ativosPorEstado.rows
    };
}

// Função para a API do dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const dashboardData = await getDashboardData();
        res.status(200).json(dashboardData);
    } catch (error) {
        console.error("Erro ao buscar dados para o dashboard:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar dados para o dashboard." });
    }
};

// Função para exportar o Excel
exports.exportDashboard = async (req, res) => {
    try {
        const data = await getDashboardData();
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Ger-Maq API';

        // --- Folha 1: Resumo Geral ---
        const resumoSheet = workbook.addWorksheet('Resumo Geral');
        resumoSheet.columns = [
            { header: 'Categoria', key: 'categoria', width: 20 }, { header: 'Total', key: 'total', width: 15 },
            { header: 'Disponível', key: 'disponivel', width: 15 }, { header: 'Em Uso', key: 'em_uso', width: 15 },
        ];
        resumoSheet.getRow(1).font = { bold: true };
        resumoSheet.addRow({ categoria: 'Máquinas', ...data.resumoMaquinas });
        resumoSheet.addRow({ categoria: 'Mobiliário', ...data.resumoMobiliario });
        resumoSheet.addRow({ categoria: 'Outros', ...data.resumoOutros });

        // --- Folha 2: Ativos por Setor ---
        const setorSheet = workbook.addWorksheet('Ativos por Setor');
        setorSheet.columns = [
            { header: 'Setor', key: 'setor', width: 30 }, { header: 'Categoria', key: 'categoria', width: 20 },
            { header: 'Quantidade', key: 'quantidade', width: 15 },
        ];
        setorSheet.getRow(1).font = { bold: true };
        setorSheet.addRows(data.ativosPorSetor);
        
        // **AQUI ESTÁ A CORREÇÃO: Folha de Ativos Não Localizados adicionada**
        const naoLocalizadosSheet = workbook.addWorksheet('Ativos Não Localizados');
        naoLocalizadosSheet.columns = [
            { header: 'Categoria', key: 'categoria', width: 25 },
            { header: 'Quantidade', key: 'quantidade', width: 15 },
        ];
        naoLocalizadosSheet.getRow(1).font = { bold: true };
        naoLocalizadosSheet.addRows(data.ativosNaoLocalizados);

        // --- Folha 4: Ativos por Estado ---
        const estadoSheet = workbook.addWorksheet('Ativos por Estado');
        estadoSheet.columns = [
            { header: 'Estado de Conservação', key: 'estado_conservacao', width: 30 },
            { header: 'Quantidade', key: 'quantidade', width: 15 },
        ];
        estadoSheet.getRow(1).font = { bold: true };
        estadoSheet.addRows(data.ativosPorEstado);

        // --- Folha 5: Empréstimos por Departamento ---
        const emprestimoSheet = workbook.addWorksheet('Empréstimos por Depto');
        emprestimoSheet.columns = [
            { header: 'Departamento', key: 'departamento', width: 30 },
            { header: 'Quantidade de Empréstimos', key: 'total', width: 25 },
        ];
        emprestimoSheet.getRow(1).font = { bold: true };
        emprestimoSheet.addRows(data.emprestimosPorDepto);

        // Envia o ficheiro para o utilizador
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'Relatorio_Dashboard.xlsx');
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Erro ao gerar o relatório:", error);
        res.status(500).json({ message: "Erro no servidor ao gerar o relatório." });
    }
};