import React from 'react';
import { Filter, Sprout, Building2, Users, Clock, MapPin } from 'lucide-react';
import { getTipoEmpresa, getClassificacao, norm } from '../services/nocodb';

export default function ChartsSection({ leads = [] }) {
  const total = leads.length || 1;

  // Tipos de Empresa (campo agora é "Tipo Empresa" com espaço, valores em lowercase)
  const typeCounts = leads.reduce((acc, l) => {
    const key = norm(getTipoEmpresa(l)) || 'outro';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Culturas (valores em lowercase)
  const cultCounts = leads.reduce((acc, l) => {
    const key = norm(l.Cultura) || 'outras culturas';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Funil de CRM
  const funil = [
    { label: 'Total Inscritos',          count: leads.length,                                                                                         color: '#4F8EF7' },
    { label: 'Leads Quentes (≥16 pts)',  count: leads.filter(l => getClassificacao(l) === 'Quente').length,                                            color: '#EF5B47' },
    { label: 'Em Contato Comercial',     count: leads.filter(l => l.Status_Lead === 'Em Contato' || l.Status_Lead === 'Qualificado').length,           color: '#F5B731' },
    { label: 'Aprovados / Parcerias',    count: leads.filter(l => l.Status_Lead === 'Qualificado' || l.Status_Lead === 'Convertido').length,           color: '#22C87A' },
  ];

  // Momento Comercial (Urgência da base)
  const momentoStats = [
    {
      label: 'Fechar parceria agora',
      sub: 'Alta prioridade comercial',
      keys: ['fechar uma parceria agora', 'quero fechar'],
      color: '#EF5B47',
      tag: 'Imediato'
    },
    {
      label: 'Avaliando fornecedores',
      sub: 'Pipeline de prospecção',
      keys: ['avaliando fornecedores', 'avaliando'],
      color: '#F5B731',
      tag: 'Médio prazo'
    },
    {
      label: 'Conhecendo o mercado',
      sub: 'Nutrição e relacionamento',
      keys: ['só conhecendo', 'so conhecendo', 'conhecendo'],
      color: '#5A6478',
      tag: 'Longo prazo'
    },
  ].map(m => {
    const count = leads.filter(l => {
      const val = norm(l.momento_empresa);
      return m.keys.some(k => val.includes(k));
    }).length;
    return { ...m, count, pct: Math.round((count / total) * 100) };
  });

  // Top Cidades
  const cityCounts = leads.reduce((acc, l) => {
    const raw = (l.Cidade || '').trim();
    if (!raw) return acc;
    // Normalizar capitalização para exibição
    const formatted = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    acc[formatted] = (acc[formatted] || 0) + 1;
    return acc;
  }, {});

  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxCityCount = topCities.length > 0 ? topCities[0][1] : 1;

  // Barras auxiliares
  const ProgressBar = ({ pct, color }) => (
    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.5s ease' }} />
    </div>
  );

  const sectionStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
  };

  const titleStyle = {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '12px',
      margin: '0 20px 12px 20px'
    }}>
      {/* 1. Funil de Conversão */}
      <div style={sectionStyle}>
        <div style={titleStyle}>
          <Filter size={14} color="#4F8EF7" />
          Funil de Conversão
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {funil.map((step, idx) => {
            const pct = Math.round((step.count / total) * 100);
            return (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{step.label}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{step.count}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>{pct}%</span>
                  </div>
                </div>
                <ProgressBar pct={pct} color={step.color} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Perfil dos Canais */}
      <div style={sectionStyle}>
        <div style={titleStyle}>
          <Building2 size={14} color="#22C87A" />
          Perfil dos Canais
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Distribuidor de insumos',      keys: ['distribuidor de insumos agrícolas', 'distribuidor'],     color: '#4F8EF7' },
            { label: 'Revenda de insumos',            keys: ['revenda de insumos agrícolas', 'revenda'],               color: '#22C87A' },
            { label: 'Representante (RTV/RC)',        keys: ['representante comercial (rtv)', 'representante comercial (rc)'], color: '#F5B731' },
            { label: 'Cooperativa',                  keys: ['cooperativa'],                                            color: '#8B7CF8' },
            { label: 'Outro (fora do escopo)',        keys: ['outro'],                                                  color: '#5A6478' },
          ].map((item, idx) => {
            const count = item.keys.reduce((sum, k) => sum + (typeCounts[k] || 0), 0);
            const pct = Math.round((count / total) * 100);
            return (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{count} ({pct}%)</strong>
                </div>
                <ProgressBar pct={pct} color={item.color} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Momento Comercial (Urgência da base) */}
      <div style={sectionStyle}>
        <div style={titleStyle}>
          <Clock size={14} color="#EF5B47" />
          Momento de Parceria
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {momentoStats.map((item, idx) => (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '5px' }}>
                <div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{item.label}</span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.sub}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <strong style={{ color: item.color, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>{item.count}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>{item.pct}%</span>
                </div>
              </div>
              <ProgressBar pct={item.pct} color={item.color} />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Fit de Culturas */}
      <div style={sectionStyle}>
        <div style={titleStyle}>
          <Sprout size={14} color="#F5B731" />
          Fit de Culturas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1, alignContent: 'start' }}>
          {[
            { label: 'Soja',    key: 'soja',           icon: '🌱', color: '#22C87A' },
            { label: 'Milho',   key: 'milho',          icon: '🌽', color: '#F5B731' },
            { label: 'Algodão', key: 'algodão',        icon: '☁️', color: '#4F8EF7' },
            { label: 'Outras',  key: 'outras culturas', icon: '🌾', color: '#5A6478' },
          ].map((item, idx) => {
            const count = cultCounts[item.key] || 0;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: item.color }}>
                    {count} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Top Cidades / Praças */}
      <div style={sectionStyle}>
        <div style={titleStyle}>
          <MapPin size={14} color="#4F8EF7" />
          Top Cidades com Mais Leads
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flex: 1 }}>
          {topCities.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              Nenhuma cidade registrada
            </div>
          ) : (
            topCities.map(([cidade, count], idx) => {
              const pct = Math.round((count / total) * 100);
              const relativeBarPct = Math.round((count / maxCityCount) * 100);
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        color: idx === 0 ? '#EF5B47' : idx === 1 ? '#F5B731' : 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        #{idx + 1}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{cidade}</span>
                    </div>
                    <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {count} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({pct}%)</span>
                    </strong>
                  </div>
                  <ProgressBar pct={relativeBarPct} color={idx === 0 ? '#EF5B47' : idx === 1 ? '#F5B731' : '#4F8EF7'} />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Capacidade & Equipe */}
      <div style={sectionStyle}>
        <div style={titleStyle}>
          <Users size={14} color="#8B7CF8" />
          Capacidade & Equipe
        </div>

        {/* Alcance */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
            Alcance de Produtores
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { label: '>150 prod.', key: 'acima de 150 produtores', color: '#22C87A' },
              { label: '51–150',     key: 'de 51 a 150 produtores',  color: '#4F8EF7' },
              { label: 'Até 50',     key: 'até 50 produtores',        color: '#5A6478' },
            ].map((p, i) => {
              const count = leads.filter(l => norm(l.qtd_produtores) === p.key).length;
              return (
                <div key={i} style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.label}</div>
                  <strong style={{ fontSize: '1.1rem', color: p.color, fontFamily: 'var(--font-mono)' }}>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* Equipe */}
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
            Estrutura de Equipe
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[
              { label: 'Comercial & Técnica',    key: 'equipe comercial e técnica',         color: '#22C87A' },
              { label: 'Equipe Parcial',          key: 'somente equipe',                    color: '#F5B731' },
              { label: 'Estruturando',            key: 'estruturando',                      color: '#5A6478' },
            ].map((eq, i) => {
              const count = leads.filter(l => norm(l.equipe || '').includes(eq.key.split(' ')[0])).length;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{eq.label}</span>
                  <strong style={{ color: eq.color, fontFamily: 'var(--font-mono)' }}>{count} ({pct}%)</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
