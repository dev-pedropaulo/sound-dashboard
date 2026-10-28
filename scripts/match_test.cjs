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

async function run() {
  const content = fs.readFileSync('C:\\Users\\devpe\\Downloads\\leads\\Formul__rio_20_10_2026.csv', 'utf8');
  const [header, ...rows] = parseCSV(content);
  
  const csvLeads = rows.map(r => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = r[idx]; });
    return obj;
  });

  const nocoLeads = await fetchNocoRecords();
  console.log(`CSV Leads: ${csvLeads.length}, NocoDB Leads: ${nocoLeads.length}`);

  function cleanPhone(p) {
    if (!p) return '';
    const digits = String(p).replace(/\D/g, '');
    return digits.slice(-8); // last 8 digits
  }

  function normEmail(e) {
    return (e || '').toLowerCase().trim();
  }

  csvLeads.forEach((csv, idx) => {
    const email = normEmail(csv.email);
    const phone = cleanPhone(csv.telefone);
    const name = csv.nome_completo;
    const empresa = csv.nome_da_empresa;

    // Find in NocoDB
    const match = nocoLeads.find(n => {
      const nEmail = normEmail(n.Email);
      const nPhone = cleanPhone(n.WhatsApp);
      if (email && nEmail && email === nEmail) return true;
      if (phone && nPhone && phone === nPhone) return true;
      return false;
    });

    console.log(`[CSV #${idx + 1}] ${name} | ${empresa} | Email: ${email} | Phone: ${csv.telefone} -> ${match ? `MATCH: NocoDB ID #${match.Id} (${match.Nome})` : 'NO MATCH'}`);
    if (csv['em_qual_estado_sua_empresa_atua_principalmente?'] === 'Outro estado') {
      console.log(`   -> Outro estado! Digitado: "${csv['digite_o_estado_em_que_sua_empresa_atua:']}" | Atual no Noco: "${match ? match.Estado : 'N/A'}"`);
    }
  });
}

run().catch(console.error);
