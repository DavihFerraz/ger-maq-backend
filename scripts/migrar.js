const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { createItem } = require('../src/controllers/itemController'); // Precisamos de adaptar para chamada de API

const caminhoCSV = path.resolve(__dirname, 'C:\Users\davihferraz\Downloads\relatorio_entidade(3).xlsx'); // <-- Coloque o caminho correto aqui

fs.createReadStream(caminhoCSV)
  .pipe(csv())
  .on('data', async (row) => {
    try {
        // Mapeia as colunas do CSV para os nomes da nossa API
        const dadosItem = {
            patrimonio: row['PLAQUETA'] || 'S/P',
            modelo_tipo: row['DESCRIÇÃO PATRIMONIO'] || 'Não especificado',
            classe: row['CLASSE'] || null,
            estado_conservacao: row['ESTADO DE \nCONS.'] || null,
            // Define a categoria com base na classe do GPM
            categoria: definirCategoria(row['CLASSE']),
            setor: 'DTI' // Pode definir um setor padrão
        };

        // Aqui faríamos a chamada à API. Por agora, vamos apenas mostrar os dados
        console.log("A processar item:", dadosItem);

        // TODO: Adicionar a lógica de chamada à API aqui
        // await axios.post('https://sua-api.onrender.com/api/itens', dadosItem, { headers });

    } catch (error) {
        console.error('Erro ao processar a linha:', row, error);
    }
  })
  .on('end', () => {
    console.log('Processamento do CSV concluído.');
  });

function definirCategoria(classeGPM) {
    if (!classeGPM) return 'OUTROS';
    const classe = classeGPM.toLowerCase();

    if (classe.includes('processamento de dados')) return 'COMPUTADOR';
    if (classe.includes('mobiliário')) return 'MOBILIARIO';
    if (classe.includes('monitor')) return 'MONITOR'; // Adicionar se a descrição contiver "monitor"

    return 'OUTROS';
}