import React from 'react';
import { Users, Flame, Sparkles, Snowflake, MapPin, TrendingUp } from 'lucide-react';
import { getClassificacao } from '../services/nocodb';
import { normalizeState } from '../utils/normalizeState';

export default function MetricCards({ leads = [], onFilterClassification, activeFilter }) {
  const total = leads.length;

  const quentes  = leads.filter(l => getClassificacao(l) === 'Quente');
  const mornos   = leads.filter(l => getClassificacao(l) === 'Morno');
  const frios    = leads.filter(l => getClassificacao(l) === 'Frio / Fora');
  const estadosFoco = leads.filter(l => {
    const uf = normalizeState(l.Estado);
    return ['MT', 'GO', 'MS', 'PR'].includes(uf);
  });

  const avgScore = total > 0
    ? (leads.reduce((acc, l) => acc + (Number(l.Pontuacao) || 0), 0) / total).toFixed(1)
    : 0;

  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

  const cards = [
    {
      id: 'ALL',
      label: 'Total de Leads',
      value: total,
      sub: `Média: ${avgScore}/20 pts`,
      color: '#4F8EF7',
      dimColor: 'rgba(79, 142, 247, 0.08)',
      icon: Users,
    },
    {
      id: 'Quente',
      label: 'Leads Quentes',
      value: quentes.length,
      sub: `${pct(quentes.length)}% da base · ≥ 16 pts`,
      color: '#EF5B47',
      dimColor: 'rgba(239, 91, 71, 0.08)',
      icon: Flame,
    },
    {
      id: 'Morno',
      label: 'Leads Mornos',
      value: mornos.length,
      sub: `${pct(mornos.length)}% da base · 11–15 pts`,
      color: '#F5B731',
      dimColor: 'rgba(245, 183, 49, 0.08)',
      icon: Sparkles,
    },
    {
      id: 'Frio / Fora',
      label: 'Frios / Fora',
      value: frios.length,
      sub: `${pct(frios.length)}% da base · ≤ 10 pts`,
      color: '#5A6478',
      dimColor: 'rgba(90, 100, 120, 0.08)',
      icon: Snowflake,
    },
    {
      id: null,
      label: 'Praças Foco',
      value: estadosFoco.length,
      sub: 'MT · GO · MS · PR',
      color: '#22C87A',
      dimColor: 'rgba(34, 200, 122, 0.08)',
      icon: MapPin,
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      gap: '12px',
      margin: '12px 20px'
    }}>
      {cards.map((card, i) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;
        const isClickable = card.id !== null;

        return (
          <div
            key={i}
            onClick={() => isClickable && onFilterClassification && onFilterClassification(card.id)}
            style={{
              background: isActive ? card.dimColor : 'var(--bg-card)',
              border: `1px solid ${isActive ? card.color + '40' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'all 0.18s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '600',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {card.label}
              </span>
              <div style={{
                width: '30px', height: '30px',
                background: card.dimColor,
                border: `1px solid ${card.color}25`,
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} color={card.color} />
              </div>
            </div>

            {/* Value */}
            <div style={{
              fontSize: '2rem',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              color: isActive ? card.color : 'var(--text-primary)',
              lineHeight: 1,
            }}>
              {card.value}
            </div>

            {/* Sub */}
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              {i === 0 && <TrendingUp size={12} color="#22C87A" />}
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
