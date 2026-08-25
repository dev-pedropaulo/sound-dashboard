import React, { useState, useMemo } from 'react';
import {
  Search, Download, Flame, Sparkles, Snowflake,
  Phone, Mail, ExternalLink, ArrowUpDown, MapPin
} from 'lucide-react';
import { getTipoEmpresa, getClassificacao, norm, formatCulturaLabel } from '../services/nocodb';
import { normalizeState } from '../utils/normalizeState';

export default function LeadsTable({
  leads = [],
  onUpdateStatus,
  onOpenLeadDetail,
  selectedStateFilter,   // UF code string ('MT') ou null
  selectedClassFilter    // 'ALL' | 'Quente' | 'Morno' | 'Frio / Fora'
}) {
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterClass, setFilterClass]   = useState('ALL');
  const [filterState, setFilterState]   = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy]             = useState('Pontuacao');
  const [sortOrder, setSortOrder]       = useState('desc');

  // Sincroniza filtro de classificação vindo de props (MetricCards)
  React.useEffect(() => {
    setFilterClass(selectedClassFilter || 'ALL');
  }, [selectedClassFilter]);

  // Sincroniza filtro de estado vindo do mapa (UF code ou null)
  React.useEffect(() => {
    setFilterState(selectedStateFilter || 'ALL');
  }, [selectedStateFilter]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Busca textual
      const s = searchTerm.toLowerCase();
      const matchSearch = !s ||
        (lead.Nome && lead.Nome.toLowerCase().includes(s)) ||
        (lead['Nome da Empresa'] && lead['Nome da Empresa'].toLowerCase().includes(s)) ||
        (lead.Cidade && lead.Cidade.toLowerCase().includes(s)) ||
        (lead.Email && lead.Email.toLowerCase().includes(s)) ||
        (lead.WhatsApp && lead.WhatsApp.includes(s));

      // Filtro de classificação — usa getClassificacao() para normalizar 'Frio / Fora'
      const matchClass = filterClass === 'ALL' || getClassificacao(lead) === filterClass;

      // Filtro de estado — compara UF normalizada (vindo tanto do mapa quanto do select)
      let matchState = true;
      if (filterState !== 'ALL') {
        const leadUF = normalizeState(lead.Estado); // ex: 'MT'
        // filterState pode ser UF ('MT') ou nome por extenso ('Mato Grosso')
        const filterUF = normalizeState(filterState); // normaliza para UF também
        if (filterState === 'OUTRO' || norm(filterState) === 'outro estado') {
          // Leads de estados fora da lista prioritária
          const priorityUFs = ['MT', 'GO', 'MS', 'PR'];
          matchState = !priorityUFs.includes(leadUF);
        } else {
          matchState = leadUF === filterUF;
        }
      }

      // Filtro de status CRM
      const matchStatus = filterStatus === 'ALL' || lead.Status_Lead === filterStatus;

      return matchSearch && matchClass && matchState && matchStatus;
    }).sort((a, b) => {
      let valA = a[sortBy], valB = b[sortBy];
      if (sortBy === 'Pontuacao' || sortBy === 'Id') {
        valA = Number(valA) || 0; valB = Number(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [leads, searchTerm, filterClass, filterState, filterStatus, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const handleExportCSV = () => {
    const headers = ['ID','Nome','Empresa','Cidade','Estado','Cultura','Produtores','Equipe','Pontuacao','Classificacao','Status','WhatsApp','Email'];
    const rows = filteredLeads.map(l => [
      l.Id, `"${l.Nome||''}"`, `"${l['Nome da Empresa']||''}"`,
      `"${l.Cidade||''}"`, `"${l.Estado||''}"`, `"${l.Cultura||''}"`,
      `"${l.qtd_produtores||''}"`, `"${l.equipe||''}"`,
      l.Pontuacao||0, `"${getClassificacao(l)}"`, `"${l.Status_Lead||''}"`,
      `"${l.WhatsApp||''}"`, `"${l.Email||''}"`
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `leads_sound_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const selectStyle = {
    padding: '7px 10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    outline: 'none',
  };

  const ClassBadge = ({ lead }) => {
    const cls = getClassificacao(lead);
    const map = {
      'Quente':      { cls: 'badge-quente', icon: <Flame size={10}/> },
      'Morno':       { cls: 'badge-morno',  icon: <Sparkles size={10}/> },
      'Frio / Fora': { cls: 'badge-frio',   icon: <Snowflake size={10}/> },
    };
    const b = map[cls] || map['Frio / Fora'];
    return (
      <span className={`badge ${b.cls}`} style={{ padding: '2px 6px', fontSize: '0.67rem' }}>
        {b.icon} {cls}
      </span>
    );
  };

  // Indicador de filtros ativos
  const hasActiveFilters = filterClass !== 'ALL' || filterState !== 'ALL' || filterStatus !== 'ALL' || searchTerm;
  const clearFilters = () => {
    setFilterClass('ALL');
    setFilterState('ALL');
    setFilterStatus('ALL');
    setSearchTerm('');
  };

  return (
    <div style={{
      margin: '0 20px 24px 20px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.02)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '360px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar nome, empresa, cidade..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              ...selectStyle,
              width: '100%',
              paddingLeft: '32px',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Filtro Classificação */}
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={selectStyle}>
          <option value="ALL">Todas Classificações</option>
          <option value="Quente">🔥 Quentes</option>
          <option value="Morno">⚡ Mornos</option>
          <option value="Frio / Fora">❄️ Frios / Fora</option>
        </select>

        {/* Filtro Estado — usa UF code internamente */}
        <select value={filterState} onChange={e => setFilterState(e.target.value)} style={selectStyle}>
          <option value="ALL">Todos os Estados</option>
          <option value="MT">Mato Grosso</option>
          <option value="GO">Goiás</option>
          <option value="MS">Mato Grosso do Sul</option>
          <option value="PR">Paraná</option>
          <option value="OUTRO">Outros Estados</option>
        </select>

        {/* Filtro Status */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="ALL">Todos os Status</option>
          <option value="Novo">Novo</option>
          <option value="Em Contato">Em Contato</option>
          <option value="Qualificado">Qualificado</option>
          <option value="Convertido">Convertido</option>
          <option value="Desqualificado">Desqualificado</option>
        </select>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn btn-secondary"
            style={{ padding: '7px 10px', fontSize: '0.78rem', color: '#EF5B47', borderColor: 'rgba(239,91,71,0.3)' }}
          >
            Limpar
          </button>
        )}

        <button
          onClick={handleExportCSV}
          className="btn btn-secondary"
          style={{ padding: '7px 12px', fontSize: '0.78rem', marginLeft: 'auto' }}
        >
          <Download size={13} />
          CSV ({filteredLeads.length})
        </button>
      </div>

      {/* Indicador de filtros ativos */}
      {hasActiveFilters && (
        <div style={{
          padding: '7px 18px',
          background: 'rgba(79,142,247,0.05)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ color: '#4F8EF7', fontWeight: '600' }}>Filtros ativos:</span>
          {filterClass !== 'ALL' && <span className="badge badge-frio" style={{ padding: '1px 7px', fontSize: '0.68rem' }}>{filterClass}</span>}
          {filterState !== 'ALL' && <span className="badge badge-frio" style={{ padding: '1px 7px', fontSize: '0.68rem' }}>{filterState}</span>}
          {filterStatus !== 'ALL' && <span className="badge badge-frio" style={{ padding: '1px 7px', fontSize: '0.68rem' }}>{filterStatus}</span>}
          {searchTerm && <span className="badge badge-frio" style={{ padding: '1px 7px', fontSize: '0.68rem' }}>"{searchTerm}"</span>}
          <span style={{ marginLeft: 'auto' }}>
            Exibindo <strong style={{ color: 'var(--text-primary)' }}>{filteredLeads.length}</strong> de {leads.length} leads
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              {[
                { label: 'Score',             field: 'Pontuacao' },
                { label: 'Empresa / Contato', field: 'Nome da Empresa' },
                { label: 'Localização',       field: 'Estado' },
                { label: 'Canal & Cultura',   field: null },
                { label: 'Status CRM',        field: 'Status_Lead' },
                { label: '',                  field: null },
              ].map((col, i) => (
                <th
                  key={i}
                  style={{ padding: '11px 16px', fontWeight: '600', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: col.field ? 'pointer' : 'default', textAlign: i === 5 ? 'right' : 'left', whiteSpace: 'nowrap' }}
                  onClick={() => col.field && toggleSort(col.field)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {col.label}
                    {col.field && <ArrowUpDown size={11} style={{ opacity: 0.5 }} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {hasActiveFilters
                    ? <>Nenhum lead encontrado com os filtros selecionados. <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#4F8EF7', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}>Limpar filtros</button></>
                    : 'Nenhum lead cadastrado.'
                  }
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead, idx) => {
                const cleanPhone = (lead.WhatsApp || '').replace(/\D/g, '');
                const tipoEmpresa = getTipoEmpresa(lead);

                return (
                  <tr
                    key={lead.Id || idx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Score */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1rem',
                          fontWeight: '800',
                          color: getClassificacao(lead) === 'Quente' ? '#EF5B47' :
                                 getClassificacao(lead) === 'Morno'  ? '#F5B731' : '#5A6478'
                        }}>
                          {lead.Pontuacao || 0}
                        </span>
                        <ClassBadge lead={lead} />
                      </div>
                    </td>

                    {/* Empresa & Contato */}
                    <td style={{ padding: '13px 16px' }}>
                      <div
                        onClick={() => onOpenLeadDetail(lead)}
                        style={{ fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.88rem', marginBottom: '2px' }}
                      >
                        {lead['Nome da Empresa'] || '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.Nome}</div>
                    </td>

                    {/* Localização */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        <MapPin size={12} color="#4F8EF7" />
                        {lead.Cidade} — {lead.Estado}
                      </div>
                    </td>

                    {/* Canal & Cultura */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        {tipoEmpresa || '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#22C87A', fontWeight: '600' }}>
                        {formatCulturaLabel(lead.Cultura)}
                      </div>
                    </td>

                    {/* Status CRM */}
                    <td style={{ padding: '13px 16px' }}>
                      <select
                        value={lead.Status_Lead || 'Novo'}
                        onChange={e => onUpdateStatus(lead.Id, e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          outline: 'none',
                          color: lead.Status_Lead === 'Qualificado'    ? '#4ADE96' :
                                 lead.Status_Lead === 'Em Contato'     ? '#FBBF24' :
                                 lead.Status_Lead === 'Convertido'     ? '#BDB0FF' :
                                 lead.Status_Lead === 'Desqualificado' ? '#F87171' : '#7BB8FF',
                        }}
                      >
                        <option value="Novo">Novo</option>
                        <option value="Em Contato">Em Contato</option>
                        <option value="Qualificado">Qualificado</option>
                        <option value="Convertido">Convertido</option>
                        <option value="Desqualificado">Desqualificado</option>
                      </select>
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=Olá%20${encodeURIComponent(lead.Nome||'')}%2C%20aqui%20é%20da%20Sound%20Agriculture.`}
                            target="_blank" rel="noopener noreferrer"
                            className="btn btn-whatsapp"
                            style={{ padding: '6px 10px' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.787 1.451 5.512 0 9.997-4.493 10-10.013.002-2.673-1.03-5.184-2.907-7.067C16.592 1.639 14.09 1.587 12 1.587c-5.514 0-10.002 4.492-10.006 10.012-.003 1.83.477 3.627 1.391 5.197L2.4 21.6l4.247-1.446zm12.518-8.313c-.154-.077-.911-.449-1.052-.5-.141-.051-.244-.077-.346.077-.102.154-.397.5-.487.603-.09.103-.18.115-.334.038-.154-.077-.65-.239-1.238-.764-.457-.408-.766-.912-.856-1.066-.09-.154-.01-.238.067-.315.069-.069.154-.18.231-.269.077-.09.103-.154.154-.256.051-.103.026-.192-.013-.269-.039-.077-.346-.834-.475-1.144-.125-.302-.25-.262-.346-.267-.09-.004-.192-.005-.294-.005-.102 0-.27.039-.41.192-.141.154-.539.526-.539 1.283 0 .756.551 1.487.628 1.59.077.103 1.085 1.657 2.628 2.324.367.159.654.254.877.325.369.117.705.101.97.062.296-.044.911-.372 1.039-.73.129-.359.129-.667.09-.73-.039-.064-.141-.103-.295-.18z"/>
                            </svg>
                          </a>
                        )}
                        {lead.Email && (
                          <a
                            href={`mailto:${lead.Email}?subject=Sound%20Agriculture%20-%20Parceria`}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                          >
                            <Mail size={15} />
                          </a>
                        )}
                        <button
                          onClick={() => onOpenLeadDetail(lead)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px' }}
                        >
                          <ExternalLink size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
