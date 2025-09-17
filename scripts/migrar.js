// scripts/migrar.js
const xlsx = require('xlsx');
const path = require('path');
const axios = require('axios'); // Vamos usar axios para fazer os pedidos à API

// --- CONFIGURAÇÃO ---
// Coloque o caminho para o seu ficheiro .xlsx aqui
const caminhoExcel = path.resolve(__dirname, '../../relatorio_entidade(3).xlsx');
// Coloque o URL da sua API (local para testar, da Render para produção)
const API_URL = 'http://localhost:3000/api/itens'; 

// Coloque um token JWT válido de um utilizador administrador
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwibm9tZSI6ImRhdmloZmVycmF6IiwicGVybWlzc2FvIjoiYWRtaW4iLCJkZXBhcnRhbWVudG8iOiJUSSIsImlhdCI6MTc1ODExNDQxMywiZXhwIjoxNzU4MTQzMjEzfQ.pjkbRf_3cqYBlHUI3wrz3ba4yhbmx1keql1h-mppD84'; 
// --- FIM DA CONFIGURAÇÃO ---


// Função para definir a categoria com base na classe do GPM
function definirCategoria(classeGPM) {
    if (!classeGPM) return 'OUTROS';
    const classe = classeGPM.toLowerCase();

    if (classe.includes('processamento de dados')) {
        // Verifica se a descrição contém "monitor" para refinar a categoria
        return 'COMPUTADOR'; // Temporariamente, podemos refinar depois
    }
    if (classe.includes('mobiliário')) return 'MOBILIARIO';

    return 'OUTROS';
}

async function migrarDados() {
    try {
        const workbook = xlsx.readFile(caminhoExcel);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const dadosJSON = xlsx.utils.sheet_to_json(worksheet);

        console.log(`Encontrados ${dadosJSON.length} registos na planilha. Iniciando a migração...`);

        for (const row of dadosJSON) {
            const dadosItem = {
                patrimonio: row['PLAQUETA'] ? String(row['PLAQUETA']) : 'S/P',
                modelo_tipo: row['DESCRIÇÃO PATRIMONIO'] || 'Não especificado',
                classe: row['CLASSE'] || null,
                estado_conservacao: row['ESTADO DE \nCONS.'] || null,
                categoria: definirCategoria(row['CLASSE']),
                setor: 'A Migrar' // Define um setor padrão
            };

            try {
                console.log(`A enviar item: ${dadosItem.patrimonio} - ${dadosItem.modelo_tipo}`);
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