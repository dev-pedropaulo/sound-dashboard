/**
 * Utilitários para formatação e manipulação de datas de leads
 */

/**
 * Retorna o timestamp numérico de um lead para ordenação precisa
 */
export function getLeadTimestamp(lead) {
  if (!lead) return 0;
  const rawDate = lead.CreatedAt || lead.created_at || lead.createdAt || lead.Data;
  if (rawDate) {
    const time = new Date(rawDate).getTime();
    if (!isNaN(time) && time > 0) return time;
  }
  // Fallback baseado no Id sequencial (Id maior = cadastrado depois)
  const idNum = Number(lead.Id || lead.id);
  if (!isNaN(idNum) && idNum > 0) {
    return idNum * 1000;
  }
  return 0;
}

/**
 * Formata data em formato curto brasileiro (ex: 22/08/2026)
 */
export function formatLeadDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

/**
 * Formata data e hora no padrão brasileiro (ex: 22/08/2026 13:43)
 */
export function formatLeadDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

/**
 * Retorna uma descrição amigável de tempo relativo (ex: 'Hoje às 14:20', 'Ontem às 10:15', '22/08/2026')
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Hoje às ${timeStr}`;
    if (isYesterday) return `Ontem às ${timeStr}`;

    return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${timeStr}`;
  } catch {
    return '—';
  }
}
