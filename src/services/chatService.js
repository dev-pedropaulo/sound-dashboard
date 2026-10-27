/**
 * Serviço de Integração com o Histórico de Atendimento WhatsApp (n8n + Postgres)
 * Tabela: sound_n8n_chat_histories
 * Session Key: telefone normalizado do WhatsApp
 */

const DEFAULT_WEBHOOK_URL =
  import.meta.env.VITE_CHAT_HISTORY_API_URL ||
  'https://agentesn8n-n8n.cqc86v.easypanel.host/webhook/sound-chat-history';

const STORAGE_KEY = 'sound_chat_api_url';

/**
 * Retorna a URL configurada para consulta do histórico de mensagens
 */
export function getChatApiUrl() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {
    console.warn('Erro ao ler chat API url do storage:', e);
  }
  return DEFAULT_WEBHOOK_URL;
}

/**
 * Salva uma nova URL de webhook no localStorage
 */
export function saveChatApiUrl(url) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, url.trim());
    }
  } catch (e) {
    console.warn('Erro ao salvar chat API url:', e);
  }
}

/**
 * Normaliza um número de telefone brasileiro para os formatos comuns de sessionKey
 */
export function normalizeChatPhone(phone = '') {
  if (!phone) return { raw: '', clean: '', withPlus: '', last8: '', last9: '' };
  
  const raw = String(phone).trim();
  let clean = raw.replace(/\D/g, '');

  // Se o número tem 10 ou 11 dígitos (DDD + número) sem o DDI 55, adiciona 55
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }

  const withPlus = '+' + clean;
  const last8 = clean.length >= 8 ? clean.slice(-8) : clean;
  const last9 = clean.length >= 9 ? clean.slice(-9) : clean;

  return { raw, clean, withPlus, last8, last9 };
}

/**
 * Analisa e extrai dados de mensagens salvas pelo LangChain no Postgres
 * Formato padrão: { id, session_id, message: { type: "human"|"ai", data: { content: "..." } } }
 */
export function parseLangChainMessage(rawRow, index = 0) {
  if (!rawRow) return null;

  let messageObj = rawRow.message;
  if (typeof messageObj === 'string') {
    try {
      messageObj = JSON.parse(messageObj);
    } catch {
      messageObj = { text: messageObj };
    }
  }

  const type = (
    messageObj?.type ||
    messageObj?.role ||
    rawRow.role ||
    rawRow.type ||
    'human'
  ).toLowerCase();

  const isHuman = type === 'human' || type === 'user' || type === 'lead' || type === 'client';
  const isAi = type === 'ai' || type === 'assistant' || type === 'bot' || type === 'agent';
  const isSystem = type === 'system';

  const rawText =
    messageObj?.data?.content ||
    messageObj?.content ||
    messageObj?.text ||
    messageObj?.data?.text ||
    (typeof messageObj === 'string' ? messageObj : JSON.stringify(messageObj || ''));

  let cleanContent = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);
  const rawContent = cleanContent;

  // Se for mensagem humana e o n8n injetou o prompt com instruções de cadastro antes
  if (isHuman && cleanContent.includes('MENSAGEM ATUAL DO CLIENTE:')) {
    const parts = cleanContent.split('MENSAGEM ATUAL DO CLIENTE:');
    const actual = parts[parts.length - 1].trim();
    if (actual) {
      cleanContent = actual;
    }
  }

  // Timestamp
  const timestamp =
    rawRow.created_at ||
    rawRow.createdAt ||
    messageObj?.data?.additional_kwargs?.timestamp ||
    messageObj?.timestamp ||
    null;

  return {
    id: rawRow.id || `msg-${index}-${Date.now()}`,
    sessionId: rawRow.session_id || rawRow.sessionId,
    sender: isHuman ? 'lead' : isAi ? 'agent' : 'system',
    senderLabel: isHuman ? 'Lead' : isAi ? 'Agente Sound Agriculture' : 'Sistema',
    content: cleanContent,
    rawContent,
    timestamp,
    raw: rawRow,
  };
}

/**
 * Busca o histórico de mensagens para um telefone via Webhook do n8n
 */
export async function fetchChatHistory(phone, leadData = null) {
  const { clean, withPlus } = normalizeChatPhone(phone);
  if (!clean) {
    return {
      success: false,
      messages: [],
      error: 'Telefone inválido ou não informado para busca de histórico.',
      isMock: false,
    };
  }

  const baseUrl = getChatApiUrl();
  const params = new URLSearchParams({
    phone: clean,
    withPlus: withPlus,
    last8: last8,
    last9: last9,
  });
  const url = `${baseUrl}?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      // Suporta respostas em formatos variados (array direto, { messages: [...] }, { data: [...] })
      let rows = [];
      if (Array.isArray(data)) {
        rows = data;
      } else if (Array.isArray(data.messages)) {
        rows = data.messages;
      } else if (Array.isArray(data.data)) {
        rows = data.data;
      } else if (Array.isArray(data.list)) {
        rows = data.list;
      }

      if (rows.length > 0) {
        const parsed = rows.map((r, i) => parseLangChainMessage(r, i)).filter(Boolean);
        return {
          success: true,
          messages: parsed,
          count: parsed.length,
          source: 'n8n_live',
          isMock: false,
        };
      } else {
        // Se a busca no banco retornou vazia, tenta gerar prévia contextual para visualização
        return {
          success: true,
          messages: leadData ? generateMockChatHistory(leadData) : [],
          count: 0,
          source: 'n8n_empty',
          isMock: true,
          notice: 'Nenhuma mensagem encontrada no banco para esta sessão telefônica. Exibindo conversa simulada baseada nas respostas do formulário.'
        };
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    console.warn(`[chatService] Falha ao conectar ao webhook do n8n (${url}):`, err.message);

    // Fallback gracioso com demonstração contextualizada para que o usuário veja a interface funcionando
    const fallbackMessages = leadData ? generateMockChatHistory(leadData) : [];
    return {
      success: true,
      messages: fallbackMessages,
      count: fallbackMessages.length,
      source: 'offline_mock',
      isMock: true,
      error: err.message,
      notice: 'Webhook do n8n não respondeu ou ainda não foi ativado. Exibindo demonstração visual com as respostas do formulário deste lead.'
    };
  }
}

/**
 * Gera uma transcrição simulada contextualizada para o lead com base em suas respostas reais
 */
export function generateMockChatHistory(lead) {
  if (!lead) return [];

  const nome = lead.Nome || 'Parceiro';
  const empresa = lead['Nome da Empresa'] || lead.Empresa || 'sua empresa';
  const tipo = lead['Tipo Empresa'] || lead.Tipo_Empresa || 'revenda';
  const cidade = lead.Cidade || 'sua região';
  const estado = lead.Estado || '';
  const cultura = lead.Cultura || 'Soja e Milho';
  const produtores = lead.qtd_produtores || 'mais de 50 produtores';
  const equipe = lead.equipe || 'equipe própria';
  const momento = lead.momento_empresa || 'avaliando novos fornecedores';
  const pts = lead.Pontuacao || 15;
  const cls = lead.Classificacao || 'Quente';

  const baseDate = new Date();
  baseDate.setHours(baseDate.getHours() - 3);

  const formatHour = (minsOffset) => {
    const d = new Date(baseDate.getTime() + minsOffset * 60000);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return [
    {
      id: 'm1',
      sender: 'lead',
      senderLabel: nome,
      content: `Olá, vi a apresentação da Sound Agriculture e gostaria de saber mais sobre as soluções de nutrição e fisiologia para ${empresa}.`,
      timestamp: formatHour(0),
    },
    {
      id: 'm2',
      sender: 'agent',
      senderLabel: 'Agente IA Sound Agriculture',
      content: `Olá, ${nome}! Seja muito bem-vindo à Sound Agriculture 🌱.\n\nSomos especialistas em destravar o potencial natural do solo e da lavoura com biologia aplicada. Para direcionar você ao Representante Comercial responsável pela sua região, posso fazer algumas perguntas rápidas sobre ${empresa}?`,
      timestamp: formatHour(1),
    },
    {
      id: 'm3',
      sender: 'lead',
      senderLabel: nome,
      content: `Claro! Atuamos como ${tipo} sediados em ${cidade} (${estado}).`,
      timestamp: formatHour(2),
    },
    {
      id: 'm4',
      sender: 'agent',
      senderLabel: 'Agente IA Sound Agriculture',
      content: `Perfeito! E quais culturas ${empresa} atende principalmente hoje em ${cidade}?`,
      timestamp: formatHour(3),
    },
    {
      id: 'm5',
      sender: 'lead',
      senderLabel: nome,
      content: `Nosso foco maior é em ${cultura}. Atendemos atualmente ${produtores} com ${equipe}.`,
      timestamp: formatHour(5),
    },
    {
      id: 'm6',
      sender: 'agent',
      senderLabel: 'Agente IA Sound Agriculture',
      content: `Excelente alcance! E qual é o momento da empresa em relação a novos parceiros e produtos de fisiologia/nutrição?`,
      timestamp: formatHour(6),
    },
    {
      id: 'm7',
      sender: 'lead',
      senderLabel: nome,
      content: `Atualmente estamos ${momento}. Queremos fortalecer nosso portfólio para a safra.`,
      timestamp: formatHour(7),
    },
    {
      id: 'm8',
      sender: 'agent',
      senderLabel: 'Agente IA Sound Agriculture',
      content: `Sensacional, ${nome}! Registrei todas as suas informações.\n\n🎯 Seu perfil foi qualificado preliminarmente como parceiro de alta prioridade (${pts} pts - ${cls}). Já notifiquei nossa equipe comercial para agendar uma reunião técnica com você!`,
      timestamp: formatHour(8),
    },
  ];
}

/**
 * Testa a conexão com a URL de Webhook configurada
 */
export async function testChatWebhookConnection(urlToTest) {
  const url = (urlToTest || getChatApiUrl()).trim();
  const testPhone = '5511999999999';
  const target = `${url}?phone=${testPhone}&test=1`;

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(target, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;
    return {
      ok: res.ok,
      status: res.status,
      latency,
      message: res.ok
        ? `Conexão bem-sucedida (${latency}ms)! O n8n respondeu com HTTP ${res.status}.`
        : `O servidor respondeu com status de erro: HTTP ${res.status} (${res.statusText}).`,
    };
  } catch (err) {
    const latency = Date.now() - startTime;
    return {
      ok: false,
      status: 0,
      latency,
      message: `Não foi possível conectar: ${err.message}. Verifique se o workflow no n8n está Ativo.`,
    };
  }
}

/**
 * Template completo do Workflow n8n para exportação/importação no n8n do usuário
 */
export const N8N_CHAT_WORKFLOW_TEMPLATE = {
  name: "Sound Agriculture - API de Histórico de Atendimento",
  nodes: [
    {
      parameters: {
        httpMethod: "GET",
        path: "sound-chat-history",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [240, 300],
      id: "webhook-sound-chat",
      name: "Webhook GET Chat"
    },
    {
      parameters: {
        operation: "executeQuery",
        query: "SELECT id, session_id, message FROM sound_n8n_chat_histories WHERE session_id = '{{ $json.query.phone }}' OR session_id = '{{ ($json.query.phone || '').replace(/\\D/g, '') }}' OR session_id = '+{{ ($json.query.phone || '').replace(/\\D/g, '') }}' OR session_id LIKE '%' || '{{ ($json.query.phone || '').replace(/\\D/g, '') }}' || '%' ORDER BY id ASC;"
      },
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.5,
      position: [480, 300],
      id: "postgres-query-memory",
      name: "Postgres Consulta Memória",
      credentials: {
        postgres: {
          id: "z3z3Im3ikcCbdOsD",
          name: "Postgres account"
        }
      }
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ { success: true, count: $input.all().length, messages: $input.all().map(i => i.json) } }}",
        options: {
          responseHeaders: {
            entries: [
              {
                name: "Access-Control-Allow-Origin",
                value: "*"
              },
              {
                name: "Access-Control-Allow-Headers",
                value: "*"
              },
              {
                name: "Access-Control-Allow-Methods",
                value: "GET, OPTIONS"
              }
            ]
          }
        }
      },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [720, 300],
      id: "respond-webhook-history",
      name: "Retornar JSON Histórico"
    }
  ],
  connections: {
    "Webhook GET Chat": {
      "main": [
        [
          {
            "node": "Postgres Consulta Memória",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Postgres Consulta Memória": {
      "main": [
        [
          {
            "node": "Retornar JSON Histórico",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  meta: {
    templateCredsSetupCompleted: true,
    instanceId: "c7d066142c3a204136686f25d3f060040ba0cd8d0715b784e06a52cadade21d7"
  }
};
