// Serviço de integração em tempo real com a API do NocoDB
const NOCODB_BASE_URL = 'https://agentesn8n-nocodb.cqc86v.easypanel.host';
const TABLE_ID = 'mtstd30v1hsddr3';
const XC_TOKEN = 'MAzqioK1wEs1N3cqgaE9yJIQ0RDloKhrZx7oW3fG';

export const NOCODB_CONFIG = {
  baseUrl: NOCODB_BASE_URL,
  tableId: TABLE_ID,
  token: XC_TOKEN
};

/**
 * Busca todos os registros de leads da tabela
 */
export async function fetchLeads(params = {}) {
  const limit = params.limit || 300;
  const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records?limit=${limit}&offset=0`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xc-token': XC_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Erro ao carregar leads: ${response.statusText}`);
  }

  const data = await response.json();
  return data.list || [];
}

/**
 * Atualiza um lead existente (ex: mudar Status_Lead, notas, etc.)
 */
export async function updateLead(leadId, updateData) {
  const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records`;
  const payload = [{ Id: leadId, ...updateData }];

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'xc-token': XC_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar lead #${leadId}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Cria um novo lead na tabela do NocoDB (pontuação manual do formulário frontend)
 */
export async function createLead(leadData) {
  const scoreResult = calculateLeadScore(leadData);
  const fullLead = {
    ...leadData,
    Pontuacao: scoreResult.score,
    Classificacao: scoreResult.classification,
    Status_Lead: leadData.Status_Lead || 'Novo'
  };

  const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records`;
  const payload = [fullLead];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xc-token': XC_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar lead: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Normaliza um valor de campo para comparação (lowercase + trim)
 */
export function norm(value = '') {
  return (value || '').toLowerCase().trim();
}

/**
 * Retorna o campo Tipo Empresa de um lead (compatível com ambos os formatos)
 */
export function getTipoEmpresa(lead) {
  return lead['Tipo Empresa'] || lead['Tipo_Empresa'] || '';
}

/**
 * Retorna a Classificação normalizada de um lead.
 * Aceita: "Frio / Fora", "Frio/Fora", "Quente", "Morno"
 */
export function getClassificacao(lead) {
  const raw = (lead.Classificacao || '').trim();
  // Normaliza variações de "Frio / Fora"
  if (raw.replace(/\s/g, '').toLowerCase() === 'frio/fora') return 'Frio / Fora';
  return raw;
}

/**
 * Helpers para correspondência de filtros nos componentes
 */
export function matchTipoEmpresa(lead, filter) {
  if (!filter || filter === 'ALL') return true;
  const tipo = norm(getTipoEmpresa(lead));
  const f = norm(filter);
  if (f === 'distribuidor') return tipo.includes('distribuidor');
  if (f === 'revenda') return tipo.includes('revenda');
  if (f === 'cooperativa') return tipo.includes('cooperativa');
  if (f === 'rtv' || f === 'representante') return tipo.includes('representante') || tipo.includes('rtv');
  if (f === 'outro') return tipo.includes('outro') || (!tipo.includes('distribuidor') && !tipo.includes('revenda') && !tipo.includes('cooperativa') && !tipo.includes('representante'));
  return tipo.includes(f);
}

export function matchCultura(lead, filter) {
  if (!filter || filter === 'ALL') return true;
  const c = norm(lead.Cultura || lead.culturas || '');
  const f = norm(filter);
  if (f === 'outras') return !c.includes('soja') && !c.includes('milho') && !c.includes('algod');
  return c.includes(f);
}

export function matchProdutores(lead, filter) {
  if (!filter || filter === 'ALL') return true;
  const p = norm(lead.qtd_produtores || lead.produtores || '');
  const f = norm(filter);
  if (f === 'ate_50') return p.includes('até 50') || p.includes('ate 50');
  if (f === '51_150') return p.includes('51 a 150');
  if (f === 'acima_150') return p.includes('acima de 150');
  return p.includes(f);
}

export function matchEquipe(lead, filter) {
  if (!filter || filter === 'ALL') return true;
  const eq = norm(lead.equipe || lead.equipe_campo || '');
  const f = norm(filter);
  if (f === 'completa') return eq.includes('comercial e téc') || eq.includes('comercial e tec');
  if (f === 'somente') return eq.includes('somente');
  if (f === 'estruturando') return eq.includes('estruturando');
  return eq.includes(f);
}

export function matchMomento(lead, filter) {
  if (!filter || filter === 'ALL') return true;
  const m = norm(lead.momento_empresa || lead.momento || '');
  const f = norm(filter);
  if (f === 'agora') return m.includes('agora');
  if (f === 'avaliando') return m.includes('avaliando');
  if (f === 'conhecendo') return m.includes('conhecendo');
  return m.includes(f);
}


/**
 * Retorna o emoji respectivo para cada cultura agrícola
 */
export function getCulturaEmoji(cultura = '') {
  const c = norm(cultura);
  if (c.includes('soja')) return '🌱';
  if (c.includes('milho')) return '🌽';
  if (c.includes('algod')) return '☁️';
  if (c.includes('café') || c.includes('cafe')) return '☕';
  if (c.includes('trigo')) return '🌾';
  if (c.includes('cana')) return '🎋';
  return '🌾';
}

/**
 * Retorna o label formatado com emoji e nome da cultura
 */
export function formatCulturaLabel(cultura = '') {
  if (!cultura) return '🌾 Geral';
  const emoji = getCulturaEmoji(cultura);
  const clean = cultura.replace(/[🌱🌽☁️☕🌾🎋]/g, '').trim();
  return `${emoji} ${clean || 'Geral'}`;
}

/**
 * Calcula a pontuação do lead (sincronizado com a matriz oficial do formulário e lógica n8n)
 * Pontuação máxima: 20 pontos
 */
export function calculateLeadScore(data) {
  let score = 0;
  let isDisqualified = false;
  let details = [];

  const tipoEmpresa = norm(data['Tipo Empresa'] || data['Tipo_Empresa'] || '');
  const estadoAtuacao = norm(data.Estado || data.estado_atuacao || '');
  const cultura = norm(data.Cultura || data.culturas || '');
  const produtores = norm(data.qtd_produtores || data.produtores || '');
  const equipe = norm(data.equipe || data.equipe_campo || '');
  const comercializacao = norm(data.comercializacao_atual || data.categoria_biologicos || '');
  const momento = norm(data.momento_empresa || data.momento || '');
  const decisor = norm(data.responsavel_portfolio || data.decisor || '');

  // 1. Sua empresa atua como:
  if (/distribuidor|revenda|cooperativa/.test(tipoEmpresa)) {
    score += 3; details.push('[Atuação] +3 pts: Distribuidor / Revenda / Cooperativa');
  } else if (/representante/.test(tipoEmpresa)) {
    score += 1; details.push('[Atuação] +1 pt: Representante comercial (RC)');
  } else if (/outro/.test(tipoEmpresa)) {
    isDisqualified = true; details.push('[Atuação] DESQUALIFICADO: Tipo fora do perfil');
  }

  // 2. Em qual estado sua empresa atua principalmente?
  if (/mato grosso do sul|^ms$/.test(estadoAtuacao)) {
    score += 2; details.push('[Estado] +2 pts: Mato Grosso do Sul');
  } else if (/mato grosso|^mt$/.test(estadoAtuacao)) {
    score += 2; details.push('[Estado] +2 pts: Mato Grosso');
  } else if (/goiás|goias|^go$/.test(estadoAtuacao)) {
    score += 2; details.push('[Estado] +2 pts: Goiás');
  } else if (/paraná|parana|^pr$/.test(estadoAtuacao)) {
    score += 2; details.push('[Estado] +2 pts: Paraná');
  } else if (/outro estado/.test(estadoAtuacao)) {
    isDisqualified = true; details.push('[Estado] DESQUALIFICADO: Atua em outro estado');
  }

  // 3. Quais culturas sua empresa atende mais?
  if (/soja|milho/.test(cultura)) {
    score += 3; details.push('[Cultura] +3 pts: Foco principal (Soja / Milho)');
  } else if (/algodão|algodao/.test(cultura)) {
    score += 2; details.push('[Cultura] +2 pts: Foco secundário (Algodão)');
  } else if (cultura) {
    score += 1; details.push('[Cultura] +1 pt: Outras culturas');
  }

  // 4. Quantos produtores sua empresa atende hoje?
  if (/acima de 150/.test(produtores)) {
    score += 3; details.push('[Produtores] +3 pts: Acima de 150 produtores');
  } else if (/51 a 150/.test(produtores)) {
    score += 2; details.push('[Produtores] +2 pts: De 51 a 150 produtores');
  } else if (produtores) {
    score += 1; details.push('[Produtores] +1 pt: Até 50 produtores');
  }

  // 5. Sua empresa tem equipe para atendimento no campo?
  if (/comercial e técnica|comercial e tecnica/.test(equipe)) {
    score += 3; details.push('[Equipe] +3 pts: Equipe comercial e técnica');
  } else if (/somente equipe comercial|somente equipe técnica|somente equipe tecnica/.test(equipe)) {
    score += 2; details.push('[Equipe] +2 pts: Somente equipe comercial ou técnica');
  } else if (/estruturando/.test(equipe)) {
    score += 1; details.push('[Equipe] +1 pt: Ainda estamos estruturando a equipe');
  }

  // 6. Sua empresa já comercializa produtos de nutrição, fisiologia ou eficiência das plantas?
  if (/já comercializamos|ja comercializamos|queremos incluir/.test(comercializacao)) {
    score += 3; details.push('[Comercialização] +3 pts: Já comercializa ou quer incluir');
  } else if (/conhecendo novas/.test(comercializacao)) {
    score += 2; details.push('[Comercialização] +2 pts: Conhecendo novas tecnologias');
  } else if (/não temos interesse|nao temos interesse/.test(comercializacao)) {
    isDisqualified = true; details.push('[Comercialização] DESQUALIFICADO: Sem interesse na categoria');
  }

  // 7. Qual é o momento da sua empresa em relação a novos fornecedores?
  if (/fechar uma parceria agora/.test(momento)) {
    score += 3; details.push('[Momento] +3 pts: Quero fechar uma parceria agora');
  } else if (/avaliando fornecedores/.test(momento)) {
    score += 2; details.push('[Momento] +2 pts: Estou avaliando fornecedores');
  } else if (/só conhecendo|so conhecendo/.test(momento)) {
    score += 1; details.push('[Momento] +1 pt: Só conhecendo o mercado');
  }

  // 8. Você é responsável pela decisão de portfólio da empresa?
  if (/sou o responsável|sou o responsavel/.test(decisor)) {
    score += 2; details.push('[Decisor] +2 pts: Sou o responsável pela decisão');
  } else if (/não sou o responsável|nao sou o responsavel/.test(decisor)) {
    score += 0; details.push('[Decisor] +0 pts: Não sou o responsável');
  }

  // Classificação final
  let classification = 'Frio / Fora';
  if (isDisqualified || score <= 10) {
    classification = 'Frio / Fora';
  } else if (score >= 11 && score <= 15) {
    classification = 'Morno';
  } else if (score >= 16) {
    classification = 'Quente';
  }

  return { score, classification, isDisqualified, details };
}
