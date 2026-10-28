const fs = require('fs');
const https = require('https');

const pracas = JSON.parse(fs.readFileSync('./src/data/defaultPracas.json', 'utf8'));

function normalizeGeoText(text = '') {
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

function buildCityIndex(pracas) {
  const cityIndex = {};
  pracas.forEach(praca => {
    const pCode = praca.codigo;
    const pNome = praca.nome;
    const pUf = praca.uf;
    const pResp = praca.responsavel || 'a definir';
    const pReg = praca.regional || 'N/A';

    const poloNorm = normalizeGeoText(pNome);
    const poloUfNorm = normalizeGeoText(pUf);
    const poloKey = `${poloNorm}_${poloUfNorm}`;

    const addEntry = (k, dist, isPolo, cidade, uf) => {
      if (!cityIndex[k]) cityIndex[k] = [];
      cityIndex[k].push({
        codigo: pCode,
        nome: pNome,
        uf: pUf,
        regional: pReg,
        responsavel: pResp,
        dist_km: dist,
        isPolo
      });
    };

    addEntry(poloKey, 0, true, pNome, pUf);
    addEntry(poloNorm, 0, true, pNome, pUf);

    (praca.cidades || []).forEach(item => {
      const cNorm = normalizeGeoText(item.cidade);
      const uNorm = normalizeGeoText(item.uf || pUf);
      const dist = typeof item.dist_km === 'number' ? item.dist_km : parseFloat(item.dist_km) || 0;
      addEntry(`${cNorm}_${uNorm}`, dist, dist < 5, item.cidade, item.uf || pUf);
      addEntry(cNorm, dist, dist < 5, item.cidade, item.uf || pUf);
    });
  });

  Object.keys(cityIndex).forEach(k => {
    cityIndex[k].sort((a, b) => a.dist_km - b.dist_km);
  });
  return cityIndex;
}

function getLeadPraca(lead, cityIndex) {
  const cNorm = normalizeGeoText(lead.Cidade);
  const uNorm = normalizeGeoText(lead.Estado);
  if (!cNorm) return null;
  const key = `${cNorm}_${uNorm}`;
  const matches = cityIndex[key] || cityIndex[cNorm];
  return matches && matches.length > 0 ? matches[0] : null;
}

function fetchLeads() {
  return new Promise((resolve, reject) => {
    const opt = {
      hostname: 'agentesn8n-nocodb.cqc86v.easypanel.host',
      path: '/api/v2/tables/mtstd30v1hsddr3/records?limit=500',
      method: 'GET',
      headers: {
        'xc-token': 'MAzqioK1wEs1N3cqgaE9yJIQ0RDloKhrZx7oW3fG',
        'Content-Type': 'application/json'
      }
    };
    https.request(opt, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b).list || []));
    }).on('error', reject).end();
  });
}

async function run() {
  const cityIndex = buildCityIndex(pracas);
  const leads = await fetchLeads();
  console.log(`Total Leads no banco: ${leads.length}`);

  const distribution = {};
  pracas.forEach(p => {
    distribution[p.codigo] = {
      nome: p.nome,
      regional: p.regional,
      rc: p.responsavel,
      count: 0
    };
  });
  distribution['FORA'] = { nome: 'Fora do Raio 250km', regional: '—', rc: 'Sem RC', count: 0 };

  leads.forEach(l => {
    const praca = getLeadPraca(l, cityIndex);
    if (praca) {
      distribution[praca.codigo].count++;
    } else {
      distribution['FORA'].count++;
    }
  });

  console.log('\nDistribuição dos leads pelas novas Praças e RCs:');
  console.table(Object.entries(distribution).map(([code, d]) => ({
    Código: code,
    Praça: d.nome,
    Regional: d.regional,
    RC: d.rc,
    Leads: d.count
  })));
}

run().catch(console.error);
