const fs = require('fs');
const https = require('https');

function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

function fetchNocoRecords() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'agentesn8n-nocodb.cqc86v.easypanel.host',
      path: '/api/v2/tables/mtstd30v1hsddr3/records?limit=500',
      method: 'GET',
      headers: {
        'xc-token': 'MAzqioK1wEs1N3cqgaE9yJIQ0RDloKhrZx7oW3fG',
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data).list || []));
    });
    req.on('error', reject);
    req.end();
  });
}

function patchNocoRecords(records) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(records);
    const options = {
      hostname: 'agentesn8n-nocodb.cqc86v.easypanel.host',
      path: '/api/v2/tables/mtstd30v1hsddr3/records',
      method: 'PATCH',
      headers: {
        'xc-token': 'MAzqioK1wEs1N3cqgaE9yJIQ0RDloKhrZx7oW3fG',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function mapPlatform(p) {
  if (!p) return '';
  const val = p.toLowerCase().trim();
  if (val === 'ig') return 'Instagram';
  if (val === 'fb') return 'Facebook';
  return p;
}

function mapEstado(csvEstado, manualEstado, leadNome) {
  if (!csvEstado) return null;
  const isOutro = csvEstado.toLowerCase().includes('outro');
  if (isOutro) {
    let est = (manualEstado || '').trim();
    if (leadNome && leadNome.toLowerCase().includes('álvaro martin') && est.toLowerCase().includes('são paulo')) {
      return 'São Paulo';
    }
    if (leadNome && leadNome.toLowerCase().includes('topspray') && est.toLowerCase() === 'sp') {
      return 'SP';
    }
    return est || 'Outro estado';
  }
  return null;
}

function toLocalTimestamp(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  
  // Format to local America/Sao_Paulo (UTC-3)
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const getPart = (type) => parts.find(p => p.type === type)?.value || '00';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

function cleanPhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  return digits.slice(-8);
}

function normEmail(e) {
  return (e || '').toLowerCase().trim();
}

async function main() {
  const csvPath = 'C:\\Users\\devpe\\Downloads\\leads\\Formul__rio_20_10_2026.csv';
  const content = fs.readFileSync(csvPath, 'utf8');
  const [header, ...rows] = parseCSV(content);

  const csvLeads = rows.map(r => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = r[idx]; });
    return obj;
  });

  const nocoLeads = await fetchNocoRecords();
  console.log(`Carregados ${nocoLeads.length} leads do NocoDB e ${csvLeads.length} leads do CSV.`);

  const updatePayloads = [];

  for (const csv of csvLeads) {
    const email = normEmail(csv.email);
    const phone = cleanPhone(csv.telefone);
    const name = csv.nome_completo;

    const match = nocoLeads.find(n => {
      const nEmail = normEmail(n.Email);
      const nPhone = cleanPhone(n.WhatsApp);
      if (email && nEmail && email === nEmail) return true;
      if (phone && nPhone && phone === nPhone) return true;
      return false;
    });

    if (!match) {
      console.warn(`AVISO: Nenhum match encontrado para: ${name} (${email})`);
      continue;
    }

    const payload = {
      Id: match.Id,
      cnpj: csv['qual_o_cnpj_da_sua_empresa?'] || '',
      Plataforma: mapPlatform(csv.platform),
      Data_Criacao: toLocalTimestamp(csv.created_time),
      Lead_ID_Meta: String(csv.id || ''),
      Campanha: csv.campaign_name || '',
      Conjunto_Anuncios: csv.adset_name || '',
      Anuncio: csv.ad_name || ''
    };

    const estadoOverride = mapEstado(
      csv['em_qual_estado_sua_empresa_atua_principalmente?'],
      csv['digite_o_estado_em_que_sua_empresa_atua:'],
      name
    );

    if (estadoOverride) {
      payload.Estado = estadoOverride;
    }

    updatePayloads.push(payload);
    console.log(`[OK] Preparado Lead #${match.Id} (${match.Nome}) - CNPJ: ${payload.cnpj} | Plataforma: ${payload.Plataforma} | Estado: ${payload.Estado || match.Estado}`);
  }

  console.log(`\nEnviando atualização de ${updatePayloads.length} registros para o NocoDB...`);
  const result = await patchNocoRecords(updatePayloads);
  console.log('Resultado da API:', result.status, result.body);
}

main().catch(console.error);
