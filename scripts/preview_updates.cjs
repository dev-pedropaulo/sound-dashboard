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
    // Special cleanup based on user prompt examples:
    // Álvaro Martin: de "outro estado" -> São Paulo (was "São Paulo estado todo")
    if (leadNome && leadNome.toLowerCase().includes('álvaro martin') && est.toLowerCase().includes('são paulo')) {
      return 'São Paulo';
    }
    return est || 'Outro estado';
  }
  return null; // Not outro, so no override unless needed
}

function formatDateTime(isoStr) {
  if (!isoStr) return null;
  // Parse date and output ISO format
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    // Format YYYY-MM-DD HH:mm:ss in local time or ISO
    return d.toISOString();
  } catch (e) {
    return isoStr;
  }
}

async function run() {
  const content = fs.readFileSync('C:\\Users\\devpe\\Downloads\\leads\\Formul__rio_20_10_2026.csv', 'utf8');
  const [header, ...rows] = parseCSV(content);
  
  const csvLeads = rows.map(r => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = r[idx]; });
    return obj;
  });

  const nocoLeads = await fetchNocoRecords();

  function cleanPhone(p) {
    if (!p) return '';
    const digits = String(p).replace(/\D/g, '');
    return digits.slice(-8);
  }

  function normEmail(e) {
    return (e || '').toLowerCase().trim();
  }

  const updates = [];

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
      console.warn(`No match found for: ${name} (${email})`);
      continue;
    }

    const payload = {
      Id: match.Id,
      cnpj: csv['qual_o_cnpj_da_sua_empresa?'] || '',
      Plataforma: mapPlatform(csv.platform),
      Data_Criacao: formatDateTime(csv.created_time),
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

    updates.push({
      leadName: match.Nome,
      payload
    });
  }

  console.log(`Generated ${updates.length} updates:`);
  console.log(JSON.stringify(updates, null, 2));
}

run().catch(console.error);
