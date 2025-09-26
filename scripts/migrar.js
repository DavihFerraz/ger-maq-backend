// scripts/migrar.js
const xlsx = require('xlsx');
const path = require('path');
const axios = require('axios');

// --- CONFIGURAÇÃO ---
const caminhoExcel = path.resolve(__dirname, '../relatorio_entidade(3).xlsx'); // Ajustado para a raiz do projeto
const API_URL = 'http://localhost:3000/api/itens'; 
// IMPORTANTE: Gere um novo token válido e cole-o aqui antes de executar
const AUTH_TOKEN = 'SEU_TOKEN_AQUI'; 
// --- FIM DA CONFIGURAÇÃO ---

// Função para extrair o nome do setor de forma mais limpa
function extrairSetor(unidadeResponsavel) {
    if (!unidadeResponsavel) return 'A Migrar';
    const partes = unidadeResponsavel.split('/');
    return partes[partes.length - 1]; // Pega a última parte (ex: DEPARTAMFINANCEIRO)
}

// Função para definir a categoria com base na classe
function definirCategoria(classeGPM) {
    if (!classeGPM) return 'OUTROS';
    const classe = classeGPM.toLowerCase();

    if (classe.includes('processamento de dados')) return 'COMPUTADOR';
    if (classe.includes('mobiliário')) return 'MOBILIARIO';
    if (classe.includes('monitor')) return 'MONITOR'; // Adicionado para monitores

    return 'OUTROS';
}

async function migrarDados() {
    try {
        const workbook = xlsx.readFile(caminhoExcel);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const dadosJSON = xlsx.utils.sheet_to_json(worksheet);

        console.log(`Encontrados ${dadosJSON.length} registos. A iniciar a migração para a API em ${API_URL}`);

        for (const row of dadosJSON) {
            // Mapeamento "lapidado" dos campos
            const dadosItem = {
                patrimonio: row['PLAQUETA'] ? String(row['PLAQUETA']) : 'S/P',
                modelo_tipo: row['DESCRIÇÃO PATRIMONIO'] || 'Não especificado',
                setor: extrairSetor(row['UNIDADE RESPONSÁVEL']),
                classe: row['CLASSE'] || 'Não especificado',
                estado_conservacao: row['ESTADO DE \nCONS.'] || 'Regular',
                categoria: definirCategoria(row['CLASSE']),
                cadastrado_gpm: true // Assumindo que todos os itens desta lista já estão no GPM
            };

            try {
                console.log(`A enviar: ${dadosItem.patrimonio} - ${dadosItem.modelo_tipo}`);
                await axios.post(API_URL, dadosItem, {
                    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
                });
                console.log(`--> SUCESSO: Item ${dadosItem.patrimonio} migrado.`);
            } catch (error) {
                const errorMessage = error.response ? error.response.data.message : error.message;
                console.error(`--> ERRO ao migrar item ${dadosItem.patrimonio}: ${errorMessage}`);
            }
        }
        console.log('Migração concluída.');

    } catch (error) {
        console.error("Erro fatal ao ler ou processar o ficheiro Excel:", error);
    }
}

// Inicia a migração
migrarDados();