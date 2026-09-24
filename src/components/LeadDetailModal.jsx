import React from 'react';
import {
  X, Flame, Sparkles, Snowflake, Phone, Mail,
  Building2, MapPin, Sprout, Users, ShieldCheck,
  Briefcase, Clock, UserCheck, ListChecks, Compass, Navigation
} from 'lucide-react';
import { getClassificacao, getTipoEmpresa, formatCulturaLabel } from '../services/nocodb';

export default function LeadDetailModal({ lead, onClose, onUpdateStatus, leadPraca }) {
  if (!lead) return null;

  const cleanPhone = (lead.WhatsApp || '').replace(/\D/g, '');
  const cls = getClassificacao(lead);

  const clsColor = cls === 'Quente' ? '#EF5B47' : cls === 'Morno' ? '#F5B731' : '#5A6478';
  const clsBadge = cls === 'Quente' ? 'badge-quente' : cls === 'Morno' ? 'badge-morno' : 'badge-frio';
  const clsIcon  = cls === 'Quente' ? <Flame size={13}/> : cls === 'Morno' ? <Sparkles size={13}/> : <Snowflake size={13}/>;

  const questions = [
    { num: 1, metric: 'Atuação',                  title: 'Sua empresa atua como:',                                                      value: getTipoEmpresa(lead),              icon: Building2 },
    { num: 2, metric: 'Estado Principal',         title: 'Em qual estado sua empresa atua principalmente?',                             value: lead.Estado,                       icon: MapPin },
    { num: 3, metric: 'Cidade Base',              title: 'Cidade / Município base:',                                                    value: lead.Cidade,                       icon: MapPin },
    { num: 4, metric: 'Culturas Atendidas',       title: 'Quais culturas sua empresa atende mais?',                                     value: lead.Cultura ? formatCulturaLabel(lead.Cultura) : null, icon: Sprout },
    { num: 5, metric: 'Produtores Atendidos',     title: 'Quantos produtores sua empresa atende hoje?',                                 value: lead.qtd_produtores,               icon: Users },
    { num: 6, metric: 'Equipe de Campo',          title: 'Sua empresa tem equipe para atendimento no campo?',                           value: lead.equipe,                       icon: ShieldCheck },
    { num: 7, metric: 'Nutrição / Fisiologia',    title: 'Já comercializa produtos de nutrição, fisiologia ou eficiência?',            value: lead.comercializacao_atual,        icon: Briefcase },
    { num: 8, metric: 'Momento de Parceria',      title: 'Qual é o momento da sua empresa em relação a novos fornecedores?',           value: lead.momento_empresa,              icon: Clock },
    { num: 9, metric: 'Decisão de Portfólio',     title: 'Você é responsável pela decisão de portfólio da empresa?',                    value: lead.responsavel_portfolio,        icon: UserCheck },
  ];

  // Linha do pontuacao_motivos (vindas do n8n)
  const motivosPts = (lead.pontuacao_motivos || '').split('\n').filter(Boolean);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(5, 7, 13, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '800px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header do Modal */}
        <div style={{
          padding: '22px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{ flex: 1 }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className={`badge ${clsBadge}`} style={{ padding: '3px 10px', fontSize: '0.75rem' }}>
                {clsIcon} {cls}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: '800',
                color: clsColor,
              }}>
                {lead.Pontuacao || 0} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '400' }}>pts</span>
              </span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '3px' }}>
              {lead['Nome da Empresa'] || 'Empresa'}
            </h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Contato: <strong style={{ color: 'var(--text-secondary)' }}>{lead.Nome}</strong>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                width: '30px', height: '30px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
              <select
                value={lead.Status_Lead || 'Novo'}
                onChange={e => onUpdateStatus(lead.Id, e.target.value)}
                style={{
                  padding: '5px 10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                <option value="Novo">Novo</option>
                <option value="Em Contato">Em Contato</option>
                <option value="Qualificado">Qualificado</option>
                <option value="Convertido">Convertido</option>
                <option value="Desqualificado">Desqualificado</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}?text=Olá%20${encodeURIComponent(lead.Nome||'')}%2C%20aqui%20é%20da%20Sound%20Agriculture.`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-whatsapp"
                  style={{ fontSize: '0.8rem' }}
                >
                  <Phone size={14} /> {lead.WhatsApp}
                </a>
              )}
              {lead.Email && (
                <a
                  href={`mailto:${lead.Email}?subject=Sound%20Agriculture%20-%20Parceria`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                >
                  <Mail size={14} /> E-mail
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Roteamento Territorial & Praça RC */}
          <div style={{
            background: leadPraca ? 'linear-gradient(135deg, rgba(0, 148, 110, 0.1) 0%, rgba(56, 97, 251, 0.08) 100%)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${leadPraca ? 'rgba(0, 148, 110, 0.3)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color={leadPraca ? '#22C87A' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Roteamento Territorial & Praça Comercial (Raio 250 km)
                </span>
              </div>
              <span style={{
                background: leadPraca ? 'rgba(34, 200, 122, 0.15)' : 'rgba(255,255,255,0.06)',
                color: leadPraca ? '#22C87A' : 'var(--text-muted)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                {leadPraca ? '✓ Dentro do Raio de Atendimento' : '⚡ Fora do Raio de 250km das Praças Ativas'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Praça Polo */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                  Praça / Polo Comercial
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: leadPraca ? '#3861FB' : 'var(--text-secondary)' }}>
                  {leadPraca ? `${leadPraca.codigo} - ${leadPraca.nome} (${leadPraca.uf})` : 'Sem praça vinculada'}
                </span>
              </div>

              {/* RC Responsável */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                  Representante Comercial (RC)
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: leadPraca?.responsavel && leadPraca.responsavel !== 'a definir' ? '#22C87A' : '#F5B731' }}>
                  {leadPraca?.responsavel || 'A definir'}
                </span>
              </div>

              {/* Distância */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                  Distância até a Cidade Polo
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {leadPraca ? (leadPraca.dist_km === 0 ? 'Cidade Polo (0 km)' : `${leadPraca.dist_km} km`) : '—'}
                </span>
              </div>
            </div>

            {/* Outras praças cobrindo */}
            {leadPraca?.outrasPracas && leadPraca.outrasPracas.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Também coberto secundariamente por: {leadPraca.outrasPracas.map(o => `${o.codigo} (${o.dist_km} km)`).join(', ')}
              </div>
            )}
          </div>

          {/* Respostas do Formulário */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Respostas do Formulário
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {questions.map(q => {
                const Icon = q.icon;
                return (
                  <div key={q.num} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                      <Icon size={12} color="#4F8EF7" />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Q{q.num} · {q.metric}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>{q.title}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {q.value || <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>Não informado</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detalhamento da Pontuação (pontuacao_motivos do n8n) */}
          {motivosPts.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ListChecks size={12} />
                Detalhamento da Pontuação
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}>
                {motivosPts.map((linha, i) => {
                  const isDesk = linha.includes('DESQUALIFICADO');
                  const isPos  = linha.includes('+');
                  return (
                    <div key={i} style={{
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-mono)',
                      color: isDesk ? '#EF5B47' : isPos ? '#22C87A' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                    }}>
                      <span style={{ opacity: 0.4, minWidth: '14px' }}>{i + 1}.</span>
                      {linha.trim()}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
