import React, { useState } from 'react';
import { BRAZIL_REAL_STATES } from '../data/brazilRealStates';
import { normalizeState } from '../utils/normalizeState';
import { getClassificacao } from '../services/nocodb';
import { MapPin, Flame, Sparkles, Snowflake } from 'lucide-react';

const PRIORITY_STATES = ['MT', 'GO', 'MS', 'PR'];

export default function BrazilMap({ leads = [], onSelectState, selectedState }) {
  const [hoveredState, setHoveredState] = useState(null);

  // Mapeamento agregado por UF usando normalizeState oficial
  const stateData = leads.reduce((acc, lead) => {
    const uf = normalizeState(lead.Estado);
    if (uf && uf !== 'N/I') {
      if (!acc[uf]) {
        acc[uf] = { total: 0, quentes: 0, mornos: 0, frios: 0, leads: [] };
      }
      acc[uf].total += 1;
      const cls = getClassificacao(lead);
      if (cls === 'Quente') acc[uf].quentes += 1;
      else if (cls === 'Morno') acc[uf].mornos += 1;
      else acc[uf].frios += 1;
      acc[uf].leads.push(lead);
    }
    return acc;
  }, {});

  const totalLeads = leads.length;

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      margin: '0 20px 24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.2rem',
            fontWeight: 800,
            color: 'var(--sound-cream)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MapPin size={20} color="#3861FB" />
            Mapa Oficial do Brasil — Distribuição de Canais & RCs
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Passe o cursor sobre qualquer UF para ver o raio-X ou clique para filtrar os leads.
          </p>
        </div>

        {/* Legenda de Cores */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap'
        }}>
          {[
            { color: '#EF5B47', label: 'Alta presença (8+)' },
            { color: '#F5A623', label: 'Em expansão (4–7)' },
            { color: '#F5D87A', label: 'Inicial (1–3)' },
            { color: 'rgba(255,255,255,0.07)', label: 'Sem registros' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', background: item.color, borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)' }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Principal: Mapa SVG Oficial + Card Lateral de Raio-X */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* Container do Mapa Oficial IBGE */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '560px',
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <svg
            viewBox="0 0 600 580"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            {BRAZIL_REAL_STATES.map((st) => {
              const data = stateData[st.id] || { total: 0, quentes: 0, mornos: 0, frios: 0 };
              const count = data.total;
              const isHovered = hoveredState?.id === st.id;
              const isSelected = selectedState === st.id;
              const isPriority = PRIORITY_STATES.includes(st.id);

              // Paleta quente: âmbar → laranja → vermelho
              let fillColor = 'rgba(255,255,255,0.05)'; // sem registros
              if (count >= 8)      fillColor = '#EF5B47'; // vermelho-coral — forte presença
              else if (count >= 4) fillColor = '#F5A623'; // laranja — em expansão
              else if (count >= 1) fillColor = '#F5D87A'; // âmbar claro — inicial

              if (isHovered || isSelected) fillColor = '#FBBF24'; // amarelo dourado no hover

              return (
                <g 
                  key={st.id} 
                  onClick={() => onSelectState && onSelectState(isSelected ? null : st.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d={st.d}
                    fill={fillColor}
                    stroke={isSelected ? '#FBBF24' : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isSelected ? '2' : '0.8'}
                    strokeLinejoin="round"
                    style={{
                      transition: 'all 0.15s ease',
                      filter: isHovered || isSelected
                        ? 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.7))'
                        : 'none'
                    }}
                    onMouseEnter={() => setHoveredState({ ...st, ...data })}
                    onMouseLeave={() => setHoveredState(null)}
                  />
                  <text
                    x={st.cx}
                    y={st.cy}
                    fill={count > 0 ? '#ffffff' : '#5A6478'}
                    fontSize={st.id === 'DF' ? '6.5' : '8.5'}
                    fontWeight="800"
                    fontFamily="var(--font-heading)"
                    textAnchor="middle"
                    dominantBaseline="central"
                    pointerEvents="none"
                  >
                    {st.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Card Lateral Informativo */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          {hoveredState || selectedState ? (
            (() => {
              const activeUF = hoveredState ? hoveredState.id : selectedState;
              const activeName = hoveredState ? hoveredState.name : (BRAZIL_REAL_STATES.find(s => s.id === selectedState)?.name || selectedState);
              const data = stateData[activeUF] || { total: 0, quentes: 0, mornos: 0, frios: 0, leads: [] };
              const isPriority = PRIORITY_STATES.includes(activeUF);

              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        background: 'rgba(79, 142, 247, 0.1)',
                        color: '#7BB8FF',
                        border: '1px solid rgba(79, 142, 247, 0.2)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: '800',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {activeUF}
                      </span>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {activeName}
                      </h4>
                    </div>

                    {isPriority && (
                      <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(34, 200, 122, 0.1)',
                        color: '#22C87A',
                        border: '1px solid rgba(34, 200, 122, 0.2)',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: '700'
                      }}>
                        FOCO SOUND
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Representantes e Canais Cadastrados:
                  </div>

                  <div style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: '#22C87A',
                    marginBottom: '12px'
                  }}>
                    {data.total} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>parceiro(s)</span>
                  </div>

                  {data.total > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{
                          flex: 1,
                          background: 'rgba(239, 91, 71, 0.08)',
                          border: '1px solid rgba(239, 91, 71, 0.2)',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <div style={{ fontSize: '0.68rem', color: '#EF5B47', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Flame size={11} /> Quentes
                          </div>
                          <strong style={{ fontSize: '1.1rem', color: '#EF5B47', fontFamily: 'var(--font-mono)' }}>
                            {data.quentes}
                          </strong>
                        </div>

                        <div style={{
                          flex: 1,
                          background: 'rgba(245, 183, 49, 0.08)',
                          border: '1px solid rgba(245, 183, 49, 0.2)',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <div style={{ fontSize: '0.68rem', color: '#F5B731', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={11} /> Mornos
                          </div>
                          <strong style={{ fontSize: '1.1rem', color: '#F5B731', fontFamily: 'var(--font-mono)' }}>
                            {data.mornos}
                          </strong>
                        </div>

                        <div style={{
                          flex: 1,
                          background: 'rgba(90, 100, 120, 0.08)',
                          border: '1px solid rgba(90, 100, 120, 0.2)',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <div style={{ fontSize: '0.68rem', color: '#8E97AB', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Snowflake size={11} /> Frios
                          </div>
                          <strong style={{ fontSize: '1.1rem', color: '#8E97AB', fontFamily: 'var(--font-mono)' }}>
                            {data.frios}
                          </strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Representa <strong style={{ color: 'var(--text-primary)' }}>{totalLeads > 0 ? ((data.total / totalLeads) * 100).toFixed(1) : 0}%</strong> do volume total de leads.
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      Nenhum candidato a parceiro cadastrado nesta UF até o momento.
                    </div>
                  )}

                  {selectedState && (
                    <button
                      onClick={() => onSelectState(null)}
                      className="btn btn-secondary"
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    >
                      Remover Filtro do Mapa
                    </button>
                  )}
                </div>
              );
            })()
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🗺️</div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sound-cream)', marginBottom: '6px' }}>
                Interaja com o Mapa do Brasil
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Passe o cursor sobre os estados ou clique para filtrar os dados por UF.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
