import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Flame, Sparkles, Snowflake, Mail,
  ExternalLink, MapPin, CheckCircle2, XCircle, Clock, Send,
  Search, ChevronDown, ChevronUp, Filter, Check, X, PlusCircle
} from 'lucide-react';
import { getClassificacao, getTipoEmpresa, norm, formatCulturaLabel, matchTipoEmpresa, matchCultura } from '../services/nocodb';
import { normalizeState } from '../utils/normalizeState';

const COLUMNS = [
  { id: 'Novo',           label: 'Novos Inscritos',          color: '#4F8EF7', icon: Clock },
  { id: 'Em Contato',     label: 'Em Contato',               color: '#F5B731', icon: Send },
  { id: 'Qualificado',    label: 'Qualificados',             color: '#22C87A', icon: CheckCircle2 },
  { id: 'Convertido',     label: 'Parceiros Contratados',    color: '#8B7CF8', icon: CheckCircle2 },
  { id: 'Desqualificado', label: 'Desqualificados',          color: '#5A6478', icon: XCircle },
];

const ALL_TEMPS = ['Quente', 'Morno', 'Frio / Fora'];
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
  const [selectedTemps, setSelectedTemps]   = useState(new Set(ALL_TEMPS));
  const [filterTipo, setFilterTipo]         = useState('ALL');
  const [filterState, setFilterState]       = useState('ALL');
  const [filterCultura, setFilterCultura]   = useState('ALL');

  const [tempDropdownOpen, setTempDropdownOpen] = useState(false);
  const tempDropdownRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (tempDropdownRef.current && !tempDropdownRef.current.contains(event.target)) {
        setTempDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const toggleTempFilter = (temp) => {
    setSelectedTemps(prev => {
      const next = new Set(prev);
      if (next.has(temp)) {
        if (next.size > 1) next.delete(temp); // evita desmarcar tudo
      } else {
        next.add(temp);
      }
      return next;
    });
  };

  const selectAllTemps = () => {
    setSelectedTemps(new Set(ALL_TEMPS));
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

      const cls = getClassificacao(lead);
      const matchTemp = selectedTemps.has(cls);

      const mTipo = matchTipoEmpresa(lead, filterTipo);
      const mCultura = matchCultura(lead, filterCultura);

      let matchState = true;
      if (filterState !== 'ALL') {
        const leadUF = normalizeState(lead.Estado);
        const filterUF = normalizeState(filterState);
        if (filterState === 'OUTRO' || norm(filterState) === 'outro estado') {
          const priorityUFs = ['MT', 'GO', 'MS', 'PR'];
          matchState = !priorityUFs.includes(leadUF);
        } else {
          matchState = leadUF === filterUF;
        }
      }

      return matchSearch && matchTemp && mTipo && mCultura && matchState;
    });
  }, [leads, searchTerm, selectedTemps, filterTipo, filterState, filterCultura]);

  const ClassBadge = ({ lead }) => {
    const cls = getClassificacao(lead);
    if (cls === 'Quente') return <span className="badge badge-quente" style={{ padding: '2px 6px', fontSize: '0.65rem' }}><Flame size={9}/> {lead.Pontuacao||0}</span>;
    if (cls === 'Morno')  return <span className="badge badge-morno"  style={{ padding: '2px 6px', fontSize: '0.65rem' }}><Sparkles size={9}/> {lead.Pontuacao||0}</span>;
    return <span className="badge badge-frio" style={{ padding: '2px 6px', fontSize: '0.65rem' }}><Snowflake size={9}/> {lead.Pontuacao||0}</span>;
  };

  const hasActiveFilters = searchTerm || selectedTemps.size < ALL_TEMPS.length || filterTipo !== 'ALL' || filterState !== 'ALL' || filterCultura !== 'ALL';

  const clearKanbanFilters = () => {
    setSearchTerm('');
    setSelectedTemps(new Set(ALL_TEMPS));
    setFilterTipo('ALL');
    setFilterState('ALL');
    setFilterCultura('ALL');
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
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
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

        {/* Filtro Tipo de Lead */}
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          style={{
            padding: '7px 10px',
            background: filterTipo !== 'ALL' ? 'rgba(56,97,251,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filterTipo !== 'ALL' ? '#3861FB' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            color: filterTipo !== 'ALL' ? '#3861FB' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: filterTipo !== 'ALL' ? '700' : 'normal',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="ALL">Todos os Tipos de Lead</option>
          <option value="distribuidor">🏢 Distribuidor</option>
          <option value="revenda">🏪 Revenda Agrícola</option>
          <option value="cooperativa">🤝 Cooperativa</option>
          <option value="rtv">💼 Representante (RTV)</option>
          <option value="outro">📦 Outro Perfil</option>
        </select>

        {/* Filtro Estado */}
        <select
          value={filterState}
          onChange={e => setFilterState(e.target.value)}
          style={{
            padding: '7px 10px',
            background: filterState !== 'ALL' ? 'rgba(79,142,247,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filterState !== 'ALL' ? '#4F8EF7' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            color: filterState !== 'ALL' ? '#4F8EF7' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: filterState !== 'ALL' ? '700' : 'normal',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="ALL">Todos os Estados</option>
          <option value="MT">Mato Grosso</option>
          <option value="GO">Goiás</option>
          <option value="MS">Mato Grosso do Sul</option>
          <option value="PR">Paraná</option>
          <option value="OUTRO">Outros Estados</option>
        </select>

        {/* Filtro Cultura */}
        <select
          value={filterCultura}
          onChange={e => setFilterCultura(e.target.value)}
          style={{
            padding: '7px 10px',
            background: filterCultura !== 'ALL' ? 'rgba(34,200,122,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filterCultura !== 'ALL' ? '#22C87A' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            color: filterCultura !== 'ALL' ? '#22C87A' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: filterCultura !== 'ALL' ? '700' : 'normal',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="ALL">Todas as Culturas</option>
          <option value="soja">🌱 Soja</option>
          <option value="milho">🌽 Milho</option>
          <option value="algod">☁️ Algodão</option>
          <option value="cafe">☕ Café</option>
          <option value="trigo">🌾 Trigo</option>
          <option value="cana">🎋 Cana</option>
          <option value="outras">🌾 Outras</option>
        </select>

        {/* Seletor Múltiplo de Temperatura (Dropdown com Multiple Selection) */}
        <div style={{ position: 'relative' }} ref={tempDropdownRef}>
          <button
            onClick={() => setTempDropdownOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              background: selectedTemps.size < ALL_TEMPS.length ? 'rgba(79, 142, 247, 0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedTemps.size < ALL_TEMPS.length ? 'rgba(79, 142, 247, 0.3)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            <Filter size={13} color={selectedTemps.size < ALL_TEMPS.length ? '#4F8EF7' : 'var(--text-muted)'} />
            <span>
              {selectedTemps.size === ALL_TEMPS.length
                ? 'Todas as Temperaturas'
                : `${selectedTemps.size} selecionada(s)`}
            </span>
            <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: tempDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {tempDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 100,
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              padding: '8px',
              minWidth: '210px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Temperatura</span>
                <button
                  onClick={selectAllTemps}
                  style={{ background: 'none', border: 'none', color: '#4F8EF7', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Marcar todas
                </button>
              </div>
              {ALL_TEMPS.map(t => {
                const isSelected = selectedTemps.has(t);
                return (
                  <div
                    key={t}
                    onClick={() => toggleTempFilter(t)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{
                      width: '14px', height: '14px',
                      borderRadius: '3px',
                      border: `1px solid ${isSelected ? '#4F8EF7' : 'var(--border-medium)'}`,
                      background: isSelected ? '#4F8EF7' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && <Check size={10} color="#fff" />}
                    </div>
                    {t === 'Quente' ? '🔥 Quente (≥16)' : t === 'Morno' ? '⚡ Morno (11-15)' : '❄️ Frio / Fora (≤10)'}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Limpar Filtros do Kanban */}
        {hasActiveFilters && (
          <button
            onClick={clearKanbanFilters}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#EF5B47', borderColor: 'rgba(239,91,71,0.3)' }}
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
