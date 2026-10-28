const fs = require('fs');
const https = require('https');

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data.replace(/^\uFEFF/, ''))));
    }).on('error', reject);
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function main() {
  const defaultPracasPath = 'c:\\Users\\devpe\\OneDrive\\Documentos\\sound-dashboard\\src\\data\\defaultPracas.json';
  const existingPracas = JSON.parse(fs.readFileSync(defaultPracasPath, 'utf8'));

  console.log('Carregando dados geográficos de municípios brasileiros...');
  const [municipios, ufs] = await Promise.all([
    getJSON('https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json'),
    getJSON('https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/estados.json')
  ]);

  const ufMap = {};
  ufs.forEach(u => ufMap[u.codigo_uf] = u.uf);

  // Mapeamento das novas praças conforme fornecido na imagem do usuário
  const newDefinitions = [
    {
      codigo: 'SOR',
      nome: 'Sorriso',
      uf: 'MT',
      regional: 'Cerrado',
      responsavel: 'Leonardo Pereira'
    },
    {
      codigo: 'LRV',
      nome: 'Lucas do Rio Verde',
      uf: 'MT',
      regional: 'Cerrado',
      responsavel: 'Tazir Barbosa'
    },
    {
      codigo: 'SNP',
      nome: 'Sinop',
      uf: 'MT',
      regional: 'Cerrado',
      responsavel: 'Rafael Marquês'
    },
    {
      codigo: 'PVA',
      nome: 'Primavera do Leste',
      uf: 'MT',
      regional: 'Cerrado',
      responsavel: 'Leonardo Serafim'
    },
    {
      codigo: 'ROO',
      nome: 'Rondonópolis',
      uf: 'MT',
      regional: 'Cerrado',
      responsavel: 'OPEN'
    },
    {
      codigo: 'QUE',
      nome: 'Querência',
      uf: 'MT',
      regional: 'Cerrado',
      responsavel: 'Paulo Corrêa'
    },
    {
      codigo: 'CNP',
      nome: 'Campo Novo do Parecis',
      uf: 'MT',
      regional: 'Cerrado',
      responsavel: 'Frederico Eleutério'
    },
    {
      codigo: 'RVD',
      nome: 'Rio Verde',
      uf: 'GO',
      regional: 'Sul',
      responsavel: 'Matheus Arantes'
    },
    {
      codigo: 'CHP',
      nome: 'Chapadão do Céu',
      uf: 'GO',
      regional: 'Sul',
      responsavel: 'Leandro Chiconi'
    },
    {
      codigo: 'CVL',
      nome: 'Cascavel',
      uf: 'PR',
      regional: 'Sul',
      responsavel: 'Andrei Pass'
    },
    {
      codigo: 'LDA',
      nome: 'Londrina/Maringá',
      uf: 'PR',
      regional: 'Sul',
      responsavel: 'Alan Carneiro'
    },
    {
      codigo: 'DOU',
      nome: 'Dourados',
      uf: 'MS',
      regional: 'Sul',
      responsavel: 'Luis Ballhestero'
    }
  ];

  // Calcular raio 250km para Dourados - MS
  const douradosCoords = municipios.find(m => m.nome === 'Dourados' && ufMap[m.codigo_uf] === 'MS');
  const douradosCidades = [];
  municipios.forEach(m => {
    const uf = ufMap[m.codigo_uf];
    const dist = haversine(douradosCoords.latitude, douradosCoords.longitude, m.latitude, m.longitude);
    if (dist <= 250) {
      douradosCidades.push({
        cidade: m.nome,
        uf: uf,
        dist_km: Math.round(dist * 10) / 10
      });
    }
  });
  douradosCidades.sort((a, b) => a.dist_km - b.dist_km);
  console.log(`Calculadas ${douradosCidades.length} cidades no raio de 250km de Dourados - MS.`);

  const updatedPracas = newDefinitions.map(def => {
    // Localizar praça existente correspondente por código exato
    let existing = null;
    if (def.codigo === 'DOU') {
      existing = existingPracas.find(p => p.codigo === 'CGR' || p.codigo === 'DOU');
    } else {
      existing = existingPracas.find(p => p.codigo === def.codigo);
    }

    let cidades = existing ? [...existing.cidades] : [];

    if (def.codigo === 'DOU') {
      cidades = douradosCidades;
    } else if (def.codigo === 'LDA') {
      // Garantir que Maringá também está com dist_km correta ou como polo
      const hasMaringa = cidades.some(c => c.cidade.toLowerCase() === 'maringá' || c.cidade.toLowerCase() === 'maringa');
      if (!hasMaringa) {
        cidades.unshift({ cidade: 'Maringá', uf: 'PR', dist_km: 98.5 });
      }
    } else if (def.codigo === 'CHP') {
      // Garantir Chapadão do Céu como cidade inicial
      const hasCeu = cidades.some(c => c.cidade.toLowerCase().includes('céu') || c.cidade.toLowerCase().includes('ceu'));
      if (!hasCeu) {
        cidades.unshift({ cidade: 'Chapadão do Céu', uf: 'GO', dist_km: 0.1 });
      }
    } else if (def.codigo === 'CNP') {
      const hasParecis = cidades.some(c => c.cidade.toLowerCase().includes('campo novo'));
      if (!hasParecis) {
        cidades.unshift({ cidade: 'Campo Novo do Parecis', uf: 'MT', dist_km: 0.1 });
      }
    }

    return {
      codigo: def.codigo,
      nome: def.nome,
      uf: def.uf,
      regional: def.regional,
      responsavel: def.responsavel,
      cidades: cidades
    };
  });

  fs.writeFileSync(defaultPracasPath, JSON.stringify(updatedPracas, null, 2), 'utf8');
  console.log('src/data/defaultPracas.json atualizado com sucesso!');
  console.log(updatedPracas.map(p => `${p.codigo} - ${p.nome} (${p.uf}) | Regional: ${p.regional} | RC: ${p.responsavel} | Cidades: ${p.cidades.length}`));
}

main().catch(console.error);
