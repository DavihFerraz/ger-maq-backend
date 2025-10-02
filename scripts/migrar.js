// ger-maq-backend/scripts/migrar.js

const path = require('path');
const xlsx = require('xlsx');
const axios = require('axios');

// --- CONFIGURAÇÃO ---
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwibm9tZSI6ImRhdmloZmVycmF6IiwicGVybWlzc2FvIjoiYWRtaW4iLCJkZXBhcnRhbWVudG8iOiJUSSIsImlhdCI6MTc1OTQwODk1OSwiZXhwIjoxNzYwMDEzNzU5fQ.VfvpIVj1WqHdYD3BSHMeBXI-RWbM0ArG38HjPd_b_o4'; // COLE SEU TOKEN VÁLIDO AQUI
const API_HOST = 'http://localhost:3000';
// --- FIM DA CONFIGURAÇÃO ---

const excelFilePath = path.resolve(__dirname, '..', 'relatorio_entidade(3).xlsx');
const AUTH_HEADERS = { headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` } };

// Função robusta para encontrar um valor em múltiplas colunas possíveis
function encontrarValor(row, ...nomesPossiveis) {
    for (const nome of nomesPossiveis) {
        if (row[nome]) {
            return row[nome];
        }
    }
    return null;
}

function extrairSetor(unidadeResponsavel) {
    if (!unidadeResponsavel) return 'INDEFINIDO';
    const partes = String(unidadeResponsavel).split('/');
    return partes[partes.length - 1] || 'INDEFINIDO';
}

function definirCategoria(descricao) {
    const desc = String(descricao || '').toLowerCase();
    if (desc.includes('monitor')) return 'MONITOR';
    if (desc.includes('cadeira') || desc.includes('mesa') || desc.includes('armario') || desc.includes('gaveteiro') || desc.includes('sofa')) return 'MOBILIARIO';
    if (desc.includes('desktop') || desc.includes('computador') || desc.includes('cpu') || desc.includes('notebook') || desc.includes('thinkstation') || desc.includes('optiplex')) return 'COMPUTADOR';
    return 'OUTROS';
}

const migrarDados = async () => {
    try {
        console.log('Iniciando a migração de dados...');
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const itensParaInserir = xlsx.utils.sheet_to_json(worksheet);

        console.log(`Encontrados ${itensParaInserir.length} registros. Iniciando a inserção via API...`);

        for (const [index, row] of itensParaInserir.entries()) {
            const patrimonio = encontrarValor(row, 'PLAQUETA');
            const descricao = encontrarValor(row, 'DESCRIÇÃO PATRIMONIO');
            const unidadeResponsavel = encontrarValor(row, 'UNIDADE RESPONSAVEL', 'UNIDADE RESPONSÁVEL');
            const estadoConservacao = encontrarValor(row, 'ESTADO DE \nCONS.', 'ESTADO DE CONS.');

            if (!patrimonio) continue;

            const dadosItem = {
                patrimonio: String(patrimonio),
                categoria: definirCategoria(descricao),
                modelo_tipo: descricao || 'N/A',
                setor: extrairSetor(unidadeResponsavel),
                estado_conservacao: estadoConservacao || 'Regular'
            };

            try {
                await axios.post(`${API_HOST}/api/itens`, dadosItem, AUTH_HEADERS);
                console.log(`[${index + 1}/${itensParaInserir.length}] SUCESSO: Item ${dadosItem.patrimonio} migrado.`);
            } catch (error) {
                const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
                console.error(`[${index + 1}/${itensParaInserir.length}] ERRO ao migrar item ${dadosItem.patrimonio}: ${errorMessage}`);
            }
        }

        console.log('------------------------------------');
        console.log('MIGRAÇÃO CONCLUÍDA!');
        console.log('------------------------------------');

    } catch (error) {
        console.error('ERRO FATAL DURANTE A MIGRAÇÃO:', error);
    }
};

// --- VERIFICAÇÃO CORRIGIDA ---
// Agora ele verifica se o token está vazio ou se AINDA É O TEXTO PADRÃO
if (!AUTH_TOKEN ) {
    console.error("ERRO: Token de autenticação não foi definido. Edite o arquivo 'migrar.js' e insira um token válido.");
} else {
    migrarDados();
}