import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Flame, Sparkles, Snowflake, Mail,
  ExternalLink, MapPin, CheckCircle2, XCircle, Clock, Send,
  Search, ChevronDown, ChevronUp, Filter, Check, X, PlusCircle,
  Building2, Sprout
} from 'lucide-react';
import { getClassificacao, getTipoEmpresa, norm, formatCulturaLabel, matchTipoEmpresa, matchCultura } from '../services/nocodb';
import { normalizeState } from '../utils/normalizeState';
import MultiSelectDropdown from './MultiSelectDropdown';

const COLUMNS = [
  { id: 'Novo',           label: 'Novos Inscritos',          color: '#4F8EF7', icon: Clock },
  { id: 'Em Contato',     label: 'Em Contato',               color: '#F5B731', icon: Send },
  { id: 'Qualificado',    label: 'Qualificados',             color: '#22C87A', icon: CheckCircle2 },
  { id: 'Convertido',     label: 'Parceiros Contratados',    color: '#8B7CF8', icon: CheckCircle2 },
  { id: 'Desqualificado', label: 'Desqualificados',          color: '#5A6478', icon: XCircle },
];

const TIPO_OPTIONS = [
  { id: 'distribuidor', label: '🏢 Distribuidor' },
  { id: 'revenda',      label: '🏪 Revenda Agrícola' },
  { id: 'cooperativa',  label: '🤝 Cooperativa' },
  { id: 'rtv',          label: '💼 Representante (RTV)' },
  { id: 'outro',        label: '📦 Outro Perfil' },
];

const TEMP_OPTIONS = [
  { id: 'Quente',      label: '🔥 Quentes (≥16 pts)' },
  { id: 'Morno',       label: '⚡ Mornos (11-15 pts)' },
  { id: 'Frio / Fora', label: '❄️ Frios / Fora (≤10 pts)' },
];

const STATE_OPTIONS = [
  { id: 'MT',    label: 'Mato Grosso' },
  { id: 'GO',    label: 'Goiás' },
  { id: 'MS',    label: 'Mato Grosso do Sul' },
  { id: 'PR',    label: 'Paraná' },
  { id: 'OUTRO', label: 'Outros Estados' },
];

const CULTURA_OPTIONS = [
  { id: 'soja',   label: '🌱 Soja' },
  { id: 'milho',  label: '🌽 Milho' },
  { id: 'algod',  label: '☁️ Algodão' },
  { id: 'cafe',   label: '☕ Café' },
  { id: 'trigo',  label: '🌾 Trigo' },
  { id: 'cana',   label: '🎋 Cana' },
  { id: 'outras', label: '🌾 Outras' },
];

const PAGE_SIZE = 15;

export default function KanbanBoard({ leads = [], onUpdateStatus, onOpenLeadDetail }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());

  // Paginação progressiva por coluna (15 por lote)
  const [visibleCounts, setVisibleCounts] = useState({});

  // Filtros locais
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedTemps, setSelectedTemps]   = useState(new Set());
  const [selectedTipos, setSelectedTipos]     = useState(new Set());
  const [selectedStates, setSelectedStates]   = useState(new Set());
  const [selectedCulturas, setSelectedCulturas] = useState(new Set());

  const handleStatusChange = async (leadId, newStatus) => {
    if (!leadId || !newStatus) return;
    try {
      setUpdatingId(leadId);
      await onUpdateStatus(leadId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleExpand = (leadId) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const handleLoadMore = (colId) => {
    setVisibleCounts(prev => ({
      ...prev,
      [colId]: (prev[colId] || PAGE_SIZE) + PAGE_SIZE
    }));
  };

  // Filtragem dos leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const s = searchTerm.toLowerCase();
      const matchSearch = !s ||
        (lead.Nome && lead.Nome.toLowerCase().includes(s)) ||
        (lead['Nome da Empresa'] && lead['Nome da Empresa'].toLowerCase().includes(s)) ||
        (lead.Cidade && lead.Cidade.toLowerCase().includes(s));

      let matchTemp = true;
      if (selectedTemps.size > 0 && selectedTemps.size < TEMP_OPTIONS.length) {
        const cls = getClassificacao(lead);
        matchTemp = selectedTemps.has(cls);
      }

      const mTipo = matchTipoEmpresa(lead, selectedTipos);
      const mCultura = matchCultura(lead, selectedCulturas);

      let matchState = true;
      if (selectedStates.size > 0 && selectedStates.size < STATE_OPTIONS.length) {
        const leadUF = normalizeState(lead.Estado);
        const priorityUFs = ['MT', 'GO', 'MS', 'PR'];
        matchState = Array.from(selectedStates).some(st => {
          if (st === 'OUTRO') return !priorityUFs.includes(leadUF);
          return leadUF === normalizeState(st);
        });
      }

      return matchSearch && matchTemp && mTipo && mCultura && matchState;
    });
  }, [leads, searchTerm, selectedTemps, selectedTipos, selectedStates, selectedCulturas]);

  const ClassBadge = ({ lead }) => {
    const cls = getClassificacao(lead);
    if (cls === 'Quente') return <span className="badge badge-quente" style={{ padding: '2px 6px', fontSize: '0.65rem' }}><Flame size={9}/> {lead.Pontuacao||0}</span>;
    if (cls === 'Morno')  return <span className="badge badge-morno"  style={{ padding: '2px 6px', fontSize: '0.65rem' }}><Sparkles size={9}/> {lead.Pontuacao||0}</span>;
    return <span className="badge badge-frio" style={{ padding: '2px 6px', fontSize: '0.65rem' }}><Snowflake size={9}/> {lead.Pontuacao||0}</span>;
  };

  const hasActiveFilters = searchTerm ||
    (selectedTemps.size > 0 && selectedTemps.size < TEMP_OPTIONS.length) ||
    (selectedTipos.size > 0 && selectedTipos.size < TIPO_OPTIONS.length) ||
    (selectedStates.size > 0 && selectedStates.size < STATE_OPTIONS.length) ||
    (selectedCulturas.size > 0 && selectedCulturas.size < CULTURA_OPTIONS.length);

  const clearKanbanFilters = () => {
    setSearchTerm('');
    setSelectedTemps(new Set());
    setSelectedTipos(new Set());
    setSelectedStates(new Set());
    setSelectedCulturas(new Set());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '0 20px 24px 20px' }}>
      {/* Toolbar de Filtros do Pipeline */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {/* Busca rápida */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filtrar por empresa, contato ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* MultiSelect Tipo de Lead */}
        <MultiSelectDropdown
          label="Tipo de Lead"
          options={TIPO_OPTIONS}
          selectedValues={selectedTipos}
          onChange={setSelectedTipos}
          placeholder="Todos os Tipos"
          color="#3861FB"
          icon={Building2}
        />

        {/* MultiSelect Estado */}
        <MultiSelectDropdown
          label="Estado"
          options={STATE_OPTIONS}
          selectedValues={selectedStates}
          onChange={setSelectedStates}
          placeholder="Todos os Estados"
          color="#4F8EF7"
          icon={MapPin}
        />

        {/* MultiSelect Cultura */}
        <MultiSelectDropdown
          label="Cultura"
          options={CULTURA_OPTIONS}
          selectedValues={selectedCulturas}
          onChange={setSelectedCulturas}
          placeholder="Todas as Culturas"
          color="#22C87A"
          icon={Sprout}
        />

        {/* MultiSelect Temperatura */}
        <MultiSelectDropdown
          label="Temperatura"
          options={TEMP_OPTIONS}
          selectedValues={selectedTemps}
          onChange={setSelectedTemps}
          placeholder="Todas Temperaturas"
          color="#EF5B47"
          icon={Flame}
        />

        {/* Limpar Filtros do Kanban */}
        {hasActiveFilters && (
          <button
            onClick={clearKanbanFilters}
            className="btn btn-secondary"
            style={{ padding: '7px 10px', fontSize: '0.78rem', color: '#EF5B47', borderColor: 'rgba(239,91,71,0.3)' }}
          >
            Limpar Filtros
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Exibindo <strong style={{ color: 'var(--text-primary)' }}>{filteredLeads.length}</strong> de {leads.length} leads
        </div>
      </div>


      {/* Grid Kanban com Scroll Independente e Drag & Drop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        alignItems: 'start',
      }}>
        {COLUMNS.map(column => {
          const columnLeads = filteredLeads.filter(l => (l.Status_Lead || 'Novo') === column.id);
          const totalInCol = columnLeads.length;
          const visibleLimit = visibleCounts[column.id] || PAGE_SIZE;
          const displayedLeads = columnLeads.slice(0, visibleLimit);
          const remainingCount = totalInCol - visibleLimit;

          const quentesCount = columnLeads.filter(l => getClassificacao(l) === 'Quente').length;
          const IconComponent = column.icon;
          const isOver = dragOverCol === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverCol !== column.id) setDragOverCol(column.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget)) return;
                setDragOverCol(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const leadId = e.dataTransfer.getData('leadId');
                if (leadId) {
                  handleStatusChange(Number(leadId) || leadId, column.id);
                }
                setDragOverCol(null);
                setDraggedId(null);
              }}
              style={{
                background: isOver ? 'rgba(79, 142, 247, 0.05)' : 'var(--bg-card)',
                border: `1px solid ${isOver ? column.color : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                borderTop: `2px solid ${column.color}`,
                height: 'calc(100vh - 210px)',
                minHeight: '520px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              {/* Column Header (Fixo no topo da coluna) */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <IconComponent size={14} color={column.color} />
                  <span style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {column.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {quentesCount > 0 && (
                    <span style={{
                      background: 'rgba(239, 91, 71, 0.15)',
                      color: '#EF5B47',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}>
                      <Flame size={10} /> {quentesCount}
                    </span>
                  )}
                  <span style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-muted)',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {totalInCol}
                  </span>
                </div>
              </div>

              {/* Cards Container com Scroll Independente */}
              <div style={{
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1,
                overflowY: 'auto',
              }}>
                {totalInCol === 0 ? (
                  <div style={{
                    padding: '30px 12px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.76rem',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: '4px',
                  }}>
                    {isOver ? 'Solte aqui para mover' : 'Nenhum lead nesta etapa'}
                  </div>
                ) : (
                  <>
                    {displayedLeads.map(lead => {
                      const isUpdating = updatingId === lead.Id;
                      const isDragging = draggedId === lead.Id;
                      const isExpanded = expandedCardIds.has(lead.Id);
                      const cleanPhone = (lead.WhatsApp || '').replace(/\D/g, '');
                      const isQueroFechar = norm(lead.momento_empresa || '').includes('fechar');

                      return (
                        <div
                          key={lead.Id}
                          draggable={!isUpdating}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('leadId', lead.Id.toString());
                            setDraggedId(lead.Id);
                          }}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDragOverCol(null);
                          }}
                          style={{
                            background: 'var(--bg-surface)',
                            border: `1px solid ${isExpanded ? 'rgba(79, 142, 247, 0.35)' : 'var(--border-subtle)'}`,
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            opacity: isUpdating ? 0.4 : isDragging ? 0.3 : 1,
                            cursor: 'grab',
                            transition: 'all 0.15s ease',
                            boxShadow: isExpanded ? '0 4px 14px rgba(0,0,0,0.3)' : 'none',
                          }}
                        >
                          {/* Card Top: Empresa + ClassBadge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <div style={{ flex: 1, marginRight: '8px' }}>
                              <h4
                                style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer', marginBottom: '2px' }}
                                onClick={() => toggleExpand(lead.Id)}
                                title="Clique para expandir/recolher"
                              >
                                {lead['Nome da Empresa'] || 'Empresa'}
                              </h4>
                              <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{lead.Nome}</span>
                            </div>
                            <ClassBadge lead={lead} />
                          </div>

                          {/* Localização */}
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                            <MapPin size={11} color="#4F8EF7" />
                            {lead.Cidade || 'N/I'} — {lead.Estado || 'N/I'}
                          </div>

                          {/* Tags Principais */}
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                              {(getTipoEmpresa(lead) || 'Canal').split(' ')[0]}
                            </span>
                            <span style={{ background: 'rgba(34,200,122,0.08)', color: '#22C87A', padding: '2px 6px', borderRadius: '4px', fontSize: '0.67rem', border: '1px solid rgba(34,200,122,0.15)' }}>
                              {formatCulturaLabel(lead.Cultura)}
                            </span>
                            {isQueroFechar && (
                              <span style={{ background: 'rgba(239,91,71,0.12)', color: '#EF5B47', padding: '2px 6px', borderRadius: '4px', fontSize: '0.67rem', border: '1px solid rgba(239,91,71,0.2)', fontWeight: '600' }}>
                                ⚡ Fechar Agora
                              </span>
                            )}
                          </div>

                          {/* Conteúdo Expandido (aparece somente ao expandir o card) */}
                          {isExpanded && (
                            <div style={{
                              padding: '10px 0',
                              marginTop: '8px',
                              borderTop: '1px dashed var(--border-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              fontSize: '0.74rem',
                            }}>
                              {/* Detalhes rápidos */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                                <div>Produtores: <strong style={{ color: 'var(--text-secondary)' }}>{lead.qtd_produtores || 'N/I'}</strong></div>
                                <div>Equipe: <strong style={{ color: 'var(--text-secondary)' }}>{lead.equipe || 'N/I'}</strong></div>
                                {lead.Email && <div>E-mail: <strong style={{ color: 'var(--text-secondary)' }}>{lead.Email}</strong></div>}
                              </div>

                              {/* Seletor de Mudança de Etapa */}
                              <div style={{
                                marginTop: '4px',
                                padding: '8px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                              }}>
                                <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                                  Mover para Etapa:
                                </label>
                                <select
                                  value={lead.Status_Lead || 'Novo'}
                                  onChange={(e) => handleStatusChange(lead.Id, e.target.value)}
                                  disabled={isUpdating}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    background: 'var(--bg-surface-elevated)',
                                    border: '1px solid var(--border-medium)',
                                    borderRadius: '4px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    outline: 'none',
                                  }}
                                >
                                  {COLUMNS.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Card Rodapé: Ações Rápidas */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--border-subtle)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}?text=Olá%20${encodeURIComponent(lead.Nome||'')}%2C%20aqui%20é%20da%20Sound%20Agriculture.`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="btn btn-whatsapp"
                                  style={{ padding: '5px 9px' }}
                                  title="Abrir WhatsApp"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.787 1.451 5.512 0 9.997-4.493 10-10.013.002-2.673-1.03-5.184-2.907-7.067C16.592 1.639 14.09 1.587 12 1.587c-5.514 0-10.002 4.492-10.006 10.012-.003 1.83.477 3.627 1.391 5.197L2.4 21.6l4.247-1.446zm12.518-8.313c-.154-.077-.911-.449-1.052-.5-.141-.051-.244-.077-.346.077-.102.154-.397.5-.487.603-.09.103-.18.115-.334.038-.154-.077-.65-.239-1.238-.764-.457-.408-.766-.912-.856-1.066-.09-.154-.01-.238.067-.315.069-.069.154-.18.231-.269.077-.09.103-.154.154-.256.051-.103.026-.192-.013-.269-.039-.077-.346-.834-.475-1.144-.125-.302-.25-.262-.346-.267-.09-.004-.192-.005-.294-.005-.102 0-.27.039-.41.192-.141.154-.539.526-.539 1.283 0 .756.551 1.487.628 1.59.077.103 1.085 1.657 2.628 2.324.367.159.654.254.877.325.369.117.705.101.97.062.296-.044.911-.372 1.039-.73.129-.359.129-.667.09-.73-.039-.064-.141-.103-.295-.18z"/>
                                  </svg>
                                </a>
                              )}
                              {lead.Email && (
                                <a
                                  href={`mailto:${lead.Email}?subject=Sound%20Agriculture%20-%20Parceria`}
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 8px' }}
                                  title="Enviar E-mail"
                                >
                                  <Mail size={13} />
                                </a>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                onClick={() => toggleExpand(lead.Id)}
                                className="btn btn-secondary"
                                style={{ padding: '5px 8px', fontSize: '0.7rem' }}
                                title={isExpanded ? 'Recolher card' : 'Expandir e mudar etapa'}
                              >
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                              <button
                                onClick={() => onOpenLeadDetail(lead)}
                                className="btn btn-secondary"
                                style={{ padding: '5px 8px', fontSize: '0.7rem' }}
                                title="Ver Raio-X completo"
                              >
                                <ExternalLink size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Botão de Paginação Progressiva (+ Carregar Mais) */}
                    {remainingCount > 0 && (
                      <div style={{ padding: '4px 0 8px 0', textAlign: 'center' }}>
                        <button
                          onClick={() => handleLoadMore(column.id)}
                          className="btn btn-secondary"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed var(--border-medium)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <PlusCircle size={13} color="#4F8EF7" />
                          <span>Carregar mais 15</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({remainingCount} restantes)</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
