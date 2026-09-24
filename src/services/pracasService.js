import * as XLSX from 'xlsx';
import defaultPracasData from '../data/defaultPracas.json';

const STORAGE_KEY = 'sound_custom_pracas_v1';

/**
 * Normaliza strings para busca e correspondência geográfica:
 * - Remove acentos/diacríticos
 * - Remove pontuação e caracteres especiais
 * - Remove sufixos de UF no campo cidade (ex: "Rio Verde GO" -> "rio verde")
 * - Converte para minúsculas
 */
export function normalizeGeoText(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+(go|mt|ms|pr|sp|rs|sc|mg|to|ba|pa|ro|ac|al|ap|ce|df|es|ma|pb|pe|pi|rj|rn|rr|se)$/, '')
    .trim();
}

/**
 * Recupera as praças salvas no localStorage ou carrega a base padrão de 12 praças
 */
export function getStoredPracas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler praças do localStorage:', err);
  }
  return defaultPracasData;
}

/**
 * Salva as praças customizadas no localStorage
 */
export function saveStoredPracas(pracas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pracas));
    return true;
  } catch (err) {
    console.error('Erro ao salvar praças no localStorage:', err);
    return false;
  }
}

/**
 * Restaura para as praças originais fornecidas na planilha base
 */
export function resetToDefaultPracas() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  return defaultPracasData;
}

/**
 * Constrói um índice rápido de correspondência Cidade + UF -> Praça Polo mais próxima
 */
export function buildCityIndex(pracas) {
  const cityIndex = {};

  (pracas || []).forEach(praca => {
    const pCode = praca.codigo;
    const pNome = praca.nome;
    const pUf = praca.uf;
    const pResp = praca.responsavel || 'a definir';

    // Registra a própria cidade polo
    const poloNorm = normalizeGeoText(pNome);
    const poloUfNorm = normalizeGeoText(pUf);
    const poloKey = `${poloNorm}_${poloUfNorm}`;

    if (!cityIndex[poloKey]) cityIndex[poloKey] = [];
    cityIndex[poloKey].push({
      codigo: pCode,
      nome: pNome,
      uf: pUf,
      responsavel: pResp,
      dist_km: 0,
      isPolo: true,
      cidade_oficial: pNome,
      uf_oficial: pUf
    });

    if (!cityIndex[poloNorm]) cityIndex[poloNorm] = [];
    cityIndex[poloNorm].push({
      codigo: pCode,
      nome: pNome,
      uf: pUf,
      responsavel: pResp,
      dist_km: 0,
      isPolo: true,
      cidade_oficial: pNome,
      uf_oficial: pUf
    });

    // Registra cada cidade atendida no raio
    (praca.cidades || []).forEach(item => {
      const cNorm = normalizeGeoText(item.cidade);
      const uNorm = normalizeGeoText(item.uf || pUf);
      const dist = typeof item.dist_km === 'number' ? item.dist_km : parseFloat(item.dist_km) || 0;

      const fullKey = `${cNorm}_${uNorm}`;
      const entry = {
        codigo: pCode,
        nome: pNome,
        uf: pUf,
        responsavel: pResp,
        dist_km: dist,
        isPolo: dist < 5,
        cidade_oficial: item.cidade,
        uf_oficial: item.uf || pUf
      };

      if (!cityIndex[fullKey]) cityIndex[fullKey] = [];
      cityIndex[fullKey].push(entry);

      if (!cityIndex[cNorm]) cityIndex[cNorm] = [];
      cityIndex[cNorm].push(entry);
    });
  });

  // Ordena por menor distância em km para priorizar o polo mais próximo
  Object.keys(cityIndex).forEach(k => {
    cityIndex[k].sort((a, b) => a.dist_km - b.dist_km);
  });

  return cityIndex;
}

/**
 * Encontra a praça correspondente e o RC para um dado lead
 * Retorna null se estiver fora do raio de 250 km de todas as praças
 */
export function getLeadPraca(lead, cityIndex) {
  if (!lead || !cityIndex) return null;

  const cidade = lead.Cidade || '';
  const estado = lead.Estado || '';

  const cNorm = normalizeGeoText(cidade);
  const uNorm = normalizeGeoText(estado);

  if (!cNorm) return null;

  const key = `${cNorm}_${uNorm}`;
  const matches = cityIndex[key] || cityIndex[cNorm];

  if (!matches || matches.length === 0) {
    return null;
  }

  const best = matches[0];
  const outras = matches.slice(1);

  return {
    codigo: best.codigo,
    nome: best.nome,
    uf: best.uf,
    responsavel: best.responsavel,
    dist_km: best.dist_km,
    isPolo: best.isPolo,
    outrasPracas: outras
  };
}

/**
 * Lê e analisa um arquivo Excel (.xlsx, .xls) ou CSV enviado pelo usuário
 * Suporta tanto o formato original em múltiplas abas (Resumo + Abas individuais)
 * quanto planilhas planas com colunas: Praça/Polo, UF, Código, Responsável/RC, Cidade, Distância
 */
export async function parsePracasExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const pracasMap = {};

        // Caso 1: Tem aba de Resumo (estrutura da planilha padrão)
        if (workbook.SheetNames.includes('Resumo')) {
          const resumoSheet = workbook.Sheets['Resumo'];
          const resumoRows = XLSX.utils.sheet_to_json(resumoSheet, { defval: '' });

          resumoRows.forEach(row => {
            const nome = (row['Praça'] || row['Praca'] || row['Nome'] || '').toString().trim();
            const uf = (row['UF'] || row['Estado'] || '').toString().trim().toUpperCase();
            const codigo = (row['Código'] || row['Codigo'] || row['Cod'] || nome.slice(0, 3).toUpperCase()).toString().trim();
            const responsavel = (row['Responsável'] || row['Responsavel'] || row['RC'] || 'a definir').toString().trim();

            if (codigo) {
              pracasMap[codigo] = {
                codigo,
                nome: nome || codigo,
                uf,
                responsavel: responsavel || 'a definir',
                cidades: []
              };
            }
          });

          // Processa as abas de cidades
          workbook.SheetNames.forEach(sheetName => {
            if (sheetName === 'Resumo') return;

            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            // Identifica o código da praça a partir do nome da aba (ex: "SOR - Sorriso")
            let code = sheetName.split('-')[0].trim().toUpperCase();
            if (!pracasMap[code]) {
              const foundCode = Object.keys(pracasMap).find(k => sheetName.toUpperCase().includes(k));
              if (foundCode) code = foundCode;
            }

            if (!pracasMap[code]) {
              // Cria praça dinamicamente caso não estivesse no Resumo
              pracasMap[code] = {
                codigo: code,
                nome: sheetName,
                uf: '',
                responsavel: 'a definir',
                cidades: []
              };
            }

            rows.forEach(r => {
              const cidade = (r['Cidade'] || r['Município'] || r['Municipio'] || '').toString().trim();
              const uf = (r['UF'] || r['Estado'] || pracasMap[code].uf || '').toString().trim().toUpperCase();
              const distRaw = r['dist_km'] || r['Distância'] || r['Distancia'] || r['dist'] || 0;
              const dist = parseFloat(distRaw) || 0;

              if (cidade) {
                pracasMap[code].cidades.push({
                  cidade,
                  uf,
                  dist_km: Math.round(dist * 10) / 10
                });
              }
            });
          });
        } else {
          // Caso 2: Planilha plana ou única aba
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

          rows.forEach(r => {
            const codigo = (r['Código'] || r['Codigo'] || r['Cod'] || r['Praça'] || r['Praca'] || '').toString().trim().toUpperCase();
            const nome = (r['Praça'] || r['Praca'] || r['Nome'] || codigo).toString().trim();
            const uf = (r['UF'] || r['Estado'] || '').toString().trim().toUpperCase();
            const responsavel = (r['Responsável'] || r['Responsavel'] || r['RC'] || 'a definir').toString().trim();
            const cidade = (r['Cidade'] || r['Município'] || r['Municipio'] || '').toString().trim();
            const distRaw = r['dist_km'] || r['Distância'] || r['Distancia'] || 0;
            const dist = parseFloat(distRaw) || 0;

            if (!codigo) return;

            if (!pracasMap[codigo]) {
              pracasMap[codigo] = {
                codigo,
                nome,
                uf,
                responsavel,
                cidades: []
              };
            }

            if (cidade) {
              pracasMap[codigo].cidades.push({
                cidade,
                uf,
                dist_km: Math.round(dist * 10) / 10
              });
            }
          });
        }

        const pracasList = Object.values(pracasMap).map(p => ({
          ...p,
          total_cidades: p.cidades.length
        }));

        if (pracasList.length === 0) {
          reject(new Error('Nenhuma praça válida foi encontrada no arquivo. Verifique o cabeçalho das colunas.'));
          return;
        }

        resolve(pracasList);
      } catch (err) {
        reject(new Error(`Falha ao ler o arquivo Excel: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo selecionado.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta a lista atual de praças para um arquivo Excel (.xlsx) para backup
 */
export function exportPracasExcel(pracas) {
  const wb = XLSX.utils.book_new();

  // 1. Aba Resumo
  const resumoData = (pracas || []).map(p => ({
    'Praça': p.nome,
    'UF': p.uf,
    'Código': p.codigo,
    'Responsável': p.responsavel || 'a definir',
    'Cidades no raio 250km': p.cidades?.length || 0
  }));
  const wsResumo = XLSX.utils.json_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // 2. Abas individuais
  (pracas || []).forEach(p => {
    const sheetTitle = `${p.codigo} - ${p.nome}`.slice(0, 31); // limite Excel de 31 chars
    const cidadesData = (p.cidades || []).map(c => ({
      'Cidade': c.cidade,
      'UF': c.uf || p.uf,
      'dist_km': c.dist_km
    }));
    const ws = XLSX.utils.json_to_sheet(cidadesData);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  });

  XLSX.writeFile(wb, `pracas_sound_agriculture_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Gera e faz o download de uma planilha modelo (.xlsx) para facilitar a importação
 */
export function downloadPracasTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Aba Resumo
  const resumoData = [
    {
      'Praça': 'Sorriso',
      'UF': 'MT',
      'Código': 'SOR',
      'Responsável': 'Leonardo',
      'Cidades no raio 250km': 3
    },
    {
      'Praça': 'Cascavel',
      'UF': 'PR',
      'Código': 'CVL',
      'Responsável': 'Andrei',
      'Cidades no raio 250km': 2
    },
    {
      'Praça': 'Exemplo Polo Novo',
      'UF': 'GO',
      'Código': 'EXM',
      'Responsável': 'Nome do RC ou a definir',
      'Cidades no raio 250km': 2
    }
  ];
  const wsResumo = XLSX.utils.json_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // 2. Aba da praça exemplo (Múltiplas abas)
  const cidadesExm = [
    { 'Cidade': 'Exemplo Polo Novo', 'UF': 'GO', 'dist_km': 0 },
    { 'Cidade': 'Cidade Vizinha A', 'UF': 'GO', 'dist_km': 34.8 },
    { 'Cidade': 'Cidade Vizinha B', 'UF': 'GO', 'dist_km': 85.2 }
  ];
  const wsExm = XLSX.utils.json_to_sheet(cidadesExm);
  XLSX.utils.book_append_sheet(wb, wsExm, 'EXM - Exemplo Polo Novo');

  // 3. Aba Formato Alternativo (Planilha única / Plana)
  const formatoPlano = [
    {
      'Código': 'EXM',
      'Praça': 'Exemplo Polo Novo',
      'UF': 'GO',
      'Responsável': 'Nome do RC',
      'Cidade': 'Exemplo Polo Novo',
      'dist_km': 0
    },
    {
      'Código': 'EXM',
      'Praça': 'Exemplo Polo Novo',
      'UF': 'GO',
      'Responsável': 'Nome do RC',
      'Cidade': 'Cidade Vizinha A',
      'dist_km': 34.8
    },
    {
      'Código': 'EXM',
      'Praça': 'Exemplo Polo Novo',
      'UF': 'GO',
      'Responsável': 'Nome do RC',
      'Cidade': 'Cidade Vizinha B',
      'dist_km': 85.2
    }
  ];
  const wsPlano = XLSX.utils.json_to_sheet(formatoPlano);
  XLSX.utils.book_append_sheet(wb, wsPlano, 'Modelo Tabela Única');

  XLSX.writeFile(wb, 'template_modelo_pracas_sound.xlsx');
}

