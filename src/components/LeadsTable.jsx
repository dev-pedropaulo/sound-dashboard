import React, { useState, useMemo } from 'react';
import {
  Search, Download, Flame, Sparkles, Snowflake,
  Phone, Mail, ExternalLink, ArrowUpDown, MapPin,
  Filter, SlidersHorizontal, ChevronDown, ChevronUp, X,
  Building2, Sprout, Users, ShieldCheck, Clock, Compass
} from 'lucide-react';
import {
  getTipoEmpresa, getClassificacao, norm, formatCulturaLabel,
  matchTipoEmpresa, matchCultura, matchProdutores, matchEquipe, matchMomento
} from '../services/nocodb';
import { normalizeState } from '../utils/normalizeState';
import { getLeadPraca } from '../services/pracasService';
import MultiSelectDropdown from './MultiSelectDropdown';

const TIPO_OPTIONS = [
  { id: 'distribuidor', label: '🏢 Distribuidor' },
  { id: 'revenda',      label: '🏪 Revenda Agrícola' },
  { id: 'cooperativa',  label: '🤝 Cooperativa' },
  { id: 'rtv',          label: '💼 Representante (RTV)' },
  { id: 'outro',        label: '📦 Outro Perfil' },
];

const CLASS_OPTIONS = [
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

const STATUS_OPTIONS = [
  { id: 'Novo',           label: 'Novo' },
  { id: 'Em Contato',     label: 'Em Contato' },
  { id: 'Qualificado',    label: 'Qualificado' },
  { id: 'Convertido',     label: 'Convertido' },
  { id: 'Desqualificado', label: 'Desqualificado' },
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

const PRODUTORES_OPTIONS = [
  { id: 'acima_150', label: '👥 Acima de 150 produtores' },
  { id: '51_150',    label: '👥 51 a 150 produtores' },
  { id: 'ate_50',     label: '👥 Até 50 produtores' },
];

const EQUIPE_OPTIONS = [
  { id: 'completa',     label: '🏆 Comercial e Técnica' },
  { id: 'somente',      label: '👤 Somente Comercial/Técnica' },
  { id: 'estruturando', label: '🛠️ Estruturando Equipe' },
];

const MOMENTO_OPTIONS = [
  { id: 'agora',      label: '🔥 Fechar parceria agora' },
  { id: 'avaliando',   label: '⚡ Avaliando fornecedores' },
  { id: 'conhecendo',  label: '👀 Só conhecendo mercado' },
];

export default function LeadsTable({
  leads = [],
  onUpdateStatus,
  onOpenLeadDetail,
  selectedStateFilter,   // UF code string ('MT') ou null
  selectedClassFilter,   // 'ALL' | 'Quente' | 'Morno' | 'Frio / Fora'
  pracas = [],
  cityIndex = {}
}) {
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedClasses, setSelectedClasses] = useState(new Set());
  const [selectedStates, setSelectedStates]   = useState(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState(new Set());
  const [selectedTipos, setSelectedTipos]     = useState(new Set());
  const [selectedCulturas, setSelectedCulturas] = useState(new Set());
  const [selectedProdutores, setSelectedProdutores] = useState(new Set());
  const [selectedEquipes, setSelectedEquipes] = useState(new Set());
  const [selectedMomentos, setSelectedMomentos] = useState(new Set());
  const [selectedPracas, setSelectedPracas]   = useState(new Set());
  const [selectedRCs, setSelectedRCs]         = useState(new Set());

  const [showAdvanced, setShowAdvanced]     = useState(false);
  const [sortBy, setSortBy]                 = useState('Pontuacao');
  const [sortOrder, setSortOrder]           = useState('desc');

  // Opções dinâmicas de Praças a partir das praças ativas
  const pracaOptions = useMemo(() => {
    const opts = (pracas || []).map(p => ({
      id: p.codigo,
      label: `📍 ${p.codigo} - ${p.nome} (${p.responsavel || 'RC a definir'})`
    }));
    opts.push({ id: 'FORA', label: '⚡ Fora de Raio (250km)' });
    return opts;
  }, [pracas]);

  // Opções dinâmicas de RCs a partir das praças ativas
  const rcOptions = useMemo(() => {
    const rcs = new Set();
    (pracas || []).forEach(p => {
      if (p.responsavel && p.responsavel !== 'a definir') {
        rcs.add(p.responsavel);
      }
    });
    const opts = Array.from(rcs).map(r => ({
      id: r,
      label: `👤 RC ${r}`
    }));
    opts.push({ id: 'a definir', label: '⏳ RC a definir' });
    opts.push({ id: 'SEM_RC', label: '❌ Sem RC (Fora de Raio)' });
    return opts;
  }, [pracas]);

  // Sincroniza filtro de classificação vindo de props (MetricCards)
  React.useEffect(() => {
    if (selectedClassFilter && selectedClassFilter !== 'ALL') {
      setSelectedClasses(new Set([selectedClassFilter]));
    } else if (selectedClassFilter === 'ALL') {
      setSelectedClasses(new Set());
    }
  }, [selectedClassFilter]);

  // Sincroniza filtro de estado vindo do mapa (UF code ou null)
  React.useEffect(() => {
    if (selectedStateFilter && selectedStateFilter !== 'ALL') {
      setSelectedStates(new Set([selectedStateFilter]));
    } else if (selectedStateFilter === 'ALL') {
      setSelectedStates(new Set());
    }
  }, [selectedStateFilter]);

  // Anexa Praça a cada lead para buscas e ordenações
  const leadsWithPraca = useMemo(() => {
    return leads.map(lead => ({
      ...lead,
      _praca: getLeadPraca(lead, cityIndex)
    }));
  }, [leads, cityIndex]);

  const filteredLeads = useMemo(() => {
    return leadsWithPraca.filter(lead => {
      // Busca textual
      const s = searchTerm.toLowerCase();
      const matchSearch = !s ||
        (lead.Nome && lead.Nome.toLowerCase().includes(s)) ||
        (lead['Nome da Empresa'] && lead['Nome da Empresa'].toLowerCase().includes(s)) ||
        (lead.Cidade && lead.Cidade.toLowerCase().includes(s)) ||
        (lead.Email && lead.Email.toLowerCase().includes(s)) ||
        (lead.WhatsApp && lead.WhatsApp.includes(s)) ||
        (lead._praca && (
          lead._praca.nome.toLowerCase().includes(s) ||
          lead._praca.codigo.toLowerCase().includes(s) ||
          lead._praca.responsavel.toLowerCase().includes(s)
        ));

      // Filtro de classificação multi-select
      let matchClass = true;
      if (selectedClasses.size > 0 && selectedClasses.size < CLASS_OPTIONS.length) {
        const leadCls = getClassificacao(lead);
        matchClass = selectedClasses.has(leadCls);
      }

      // Filtro de estado multi-select
      let matchState = true;
      if (selectedStates.size > 0 && selectedStates.size < STATE_OPTIONS.length) {
        const leadUF = normalizeState(lead.Estado);
        const priorityUFs = ['MT', 'GO', 'MS', 'PR'];
        matchState = Array.from(selectedStates).some(st => {
          if (st === 'OUTRO') return !priorityUFs.includes(leadUF);
          return leadUF === normalizeState(st);
        });
      }

      // Filtro de status CRM multi-select
      let matchStatus = true;
      if (selectedStatuses.size > 0 && selectedStatuses.size < STATUS_OPTIONS.length) {
        matchStatus = selectedStatuses.has(lead.Status_Lead);
      }

      // Filtro de Praça Comercial
      let matchPraca = true;
      if (selectedPracas.size > 0 && selectedPracas.size < pracaOptions.length) {
        if (!lead._praca) {
          matchPraca = selectedPracas.has('FORA');
        } else {
          matchPraca = selectedPracas.has(lead._praca.codigo);
        }
      }

      // Filtro de RC Responsável
      let matchRC = true;
      if (selectedRCs.size > 0 && selectedRCs.size < rcOptions.length) {
        if (!lead._praca) {
          matchRC = selectedRCs.has('SEM_RC');
        } else {
          const resp = lead._praca.responsavel || 'a definir';
          matchRC = selectedRCs.has(resp);
        }
      }

      // Novos Filtros Multi-select
      const mTipo       = matchTipoEmpresa(lead, selectedTipos);
      const mCultura    = matchCultura(lead, selectedCulturas);
      const mProdutores = matchProdutores(lead, selectedProdutores);
      const mEquipe     = matchEquipe(lead, selectedEquipes);
      const mMomento    = matchMomento(lead, selectedMomentos);

      return matchSearch && matchClass && matchState && matchStatus && matchPraca && matchRC && mTipo && mCultura && mProdutores && mEquipe && mMomento;
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
  }, [
    leadsWithPraca, searchTerm, selectedClasses, selectedStates, selectedStatuses,
    selectedPracas, selectedRCs, pracaOptions.length, rcOptions.length,
    selectedTipos, selectedCulturas, selectedProdutores, selectedEquipes, selectedMomentos,
    sortBy, sortOrder
  ]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID','Nome','Empresa','Tipo Empresa','Cidade','Estado',
      'Praça Polo','Código Praça','RC Responsável','Distância Polo (km)',
      'Cultura','Produtores','Equipe','Momento','Pontuacao','Classificacao','Status','WhatsApp','Email'
    ];
    const rows = filteredLeads.map(l => [
      l.Id, `"${l.Nome||''}"`, `"${l['Nome da Empresa']||''}"`, `"${getTipoEmpresa(l)}"`,
      `"${l.Cidade||''}"`, `"${l.Estado||''}"`,
      `"${l._praca ? l._praca.nome : 'Fora de Raio'}"`,
      `"${l._praca ? l._praca.codigo : '—'}"`,
      `"${l._praca ? l._praca.responsavel : '—'}"`,
      l._praca ? l._praca.dist_km : '',
      `"${l.Cultura||''}"`,
      `"${l.qtd_produtores||''}"`, `"${l.equipe||''}"`, `"${l.momento_empresa||''}"`,
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

  // Contagem de filtros avançados ativos
  const advancedActiveCount = (selectedStatuses.size > 0 && selectedStatuses.size < STATUS_OPTIONS.length ? 1 : 0) +
    (selectedRCs.size > 0 && selectedRCs.size < rcOptions.length ? 1 : 0) +
    (selectedCulturas.size > 0 && selectedCulturas.size < CULTURA_OPTIONS.length ? 1 : 0) +
    (selectedProdutores.size > 0 && selectedProdutores.size < PRODUTORES_OPTIONS.length ? 1 : 0) +
    (selectedEquipes.size > 0 && selectedEquipes.size < EQUIPE_OPTIONS.length ? 1 : 0) +
    (selectedMomentos.size > 0 && selectedMomentos.size < MOMENTO_OPTIONS.length ? 1 : 0);

  const hasActiveFilters = (selectedClasses.size > 0 && selectedClasses.size < CLASS_OPTIONS.length) ||
    (selectedStates.size > 0 && selectedStates.size < STATE_OPTIONS.length) ||
    (selectedPracas.size > 0 && selectedPracas.size < pracaOptions.length) ||
    (selectedTipos.size > 0 && selectedTipos.size < TIPO_OPTIONS.length) ||
    (selectedRCs.size > 0 && selectedRCs.size < rcOptions.length) ||
    searchTerm || advancedActiveCount > 0;

  const clearFilters = () => {
    setSelectedClasses(new Set());
    setSelectedStates(new Set());
    setSelectedPracas(new Set());
    setSelectedRCs(new Set());
    setSelectedStatuses(new Set());
    setSelectedTipos(new Set());
    setSelectedCulturas(new Set());
    setSelectedProdutores(new Set());
    setSelectedEquipes(new Set());
    setSelectedMomentos(new Set());
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
      {/* Toolbar Principal */}
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
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
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

        {/* Multi-Select Praça / Polo Comercial */}
        <MultiSelectDropdown
          label="Praça / Polo (RC)"
          options={pracaOptions}
          selectedValues={selectedPracas}
          onChange={setSelectedPracas}
          placeholder="Todas as Praças"
          color="#22C87A"
          icon={Compass}
        />

        {/* Multi-Select Tipo de Lead */}
        <MultiSelectDropdown
          label="Tipo de Lead"
          options={TIPO_OPTIONS}
          selectedValues={selectedTipos}
          onChange={setSelectedTipos}
          placeholder="Todos os Tipos"
          color="#3861FB"
          icon={Building2}
        />

        {/* Multi-Select Classificação */}
        <MultiSelectDropdown
          label="Classificação"
          options={CLASS_OPTIONS}
          selectedValues={selectedClasses}
          onChange={setSelectedClasses}
          placeholder="Todas Classificações"
          color="#EF5B47"
          icon={Flame}
        />

        {/* Multi-Select Estado */}
        <MultiSelectDropdown
          label="Estado / UF"
          options={STATE_OPTIONS}
          selectedValues={selectedStates}
          onChange={setSelectedStates}
          placeholder="Todos os Estados"
          color="#4F8EF7"
          icon={MapPin}
        />

        {/* Botão Filtros Avançados */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn btn-secondary"
          style={{
            padding: '7px 12px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderColor: advancedActiveCount > 0 ? '#3861FB' : 'var(--border-subtle)',
            color: advancedActiveCount > 0 ? '#3861FB' : 'var(--text-secondary)',
            background: advancedActiveCount > 0 ? 'rgba(56,97,251,0.08)' : 'rgba(255,255,255,0.04)',
          }}
        >
          <SlidersHorizontal size={13} />
          Filtros Avançados
          {advancedActiveCount > 0 && (
            <span style={{
              background: '#3861FB',
              color: '#fff',
              borderRadius: '99px',
              padding: '1px 6px',
              fontSize: '0.68rem',
              fontWeight: '700'
            }}>
              {advancedActiveCount}
            </span>
          )}
          {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Limpar todos os filtros */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn btn-secondary"
            style={{ padding: '7px 10px', fontSize: '0.78rem', color: '#EF5B47', borderColor: 'rgba(239,91,71,0.3)' }}
          >
            Limpar Todos
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

      {/* Painel Avançado de Filtros (Expansível) */}
      {showAdvanced && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(56, 97, 251, 0.03)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          animation: 'fadeIn 0.2s ease',
        }}>
          {/* Status CRM */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Status no CRM</label>
            <MultiSelectDropdown
              label="Status CRM"
              options={STATUS_OPTIONS}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Todos os Status"
              color="#22C87A"
            />
          </div>

          {/* RC Responsável */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Representante Comercial (RC)</label>
            <MultiSelectDropdown
              label="RC Responsável"
              options={rcOptions}
              selectedValues={selectedRCs}
              onChange={setSelectedRCs}
              placeholder="Todos os RCs"
              color="#8B7CF8"
              icon={Users}
            />
          </div>

          {/* Cultura Atendida */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Cultura Atendida</label>
            <MultiSelectDropdown
              label="Cultura"
              options={CULTURA_OPTIONS}
              selectedValues={selectedCulturas}
              onChange={setSelectedCulturas}
              placeholder="Todas as Culturas"
              color="#22C87A"
              icon={Sprout}
            />
          </div>

          {/* Produtores Atendidos */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Nº de Produtores</label>
            <MultiSelectDropdown
              label="Produtores"
              options={PRODUTORES_OPTIONS}
              selectedValues={selectedProdutores}
              onChange={setSelectedProdutores}
              placeholder="Qualquer alcance"
              color="#F5B731"
              icon={Users}
            />
          </div>

          {/* Equipe Comercial/Técnica */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Estrutura de Equipe</label>
            <MultiSelectDropdown
              label="Equipe"
              options={EQUIPE_OPTIONS}
              selectedValues={selectedEquipes}
              onChange={setSelectedEquipes}
              placeholder="Qualquer equipe"
              color="#8B7CF8"
              icon={ShieldCheck}
            />
          </div>

          {/* Momento da Empresa */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Momento de Compra</label>
            <MultiSelectDropdown
              label="Momento"
              options={MOMENTO_OPTIONS}
              selectedValues={selectedMomentos}
              onChange={setSelectedMomentos}
              placeholder="Qualquer momento"
              color="#EF5B47"
              icon={Clock}
            />
          </div>
        </div>
      )}

      {/* Indicador de filtros ativos e badges */}
      {hasActiveFilters && (
        <div style={{
          padding: '8px 18px',
          background: 'rgba(79,142,247,0.05)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#4F8EF7', fontWeight: '600' }}>Filtros ativos:</span>
          
          {selectedTipos.size > 0 && selectedTipos.size < TIPO_OPTIONS.length && (
            <span className="badge badge-frio" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Tipos ({selectedTipos.size})
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSelectedTipos(new Set())} />
            </span>
          )}

          {selectedClasses.size > 0 && selectedClasses.size < CLASS_OPTIONS.length && (
            <span className="badge badge-quente" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Classif. ({selectedClasses.size})
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSelectedClasses(new Set())} />
            </span>
          )}

          {selectedStates.size > 0 && selectedStates.size < STATE_OPTIONS.length && (
            <span className="badge badge-frio" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Estados ({selectedStates.size})
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSelectedStates(new Set())} />
            </span>
          )}

          {selectedStatuses.size > 0 && selectedStatuses.size < STATUS_OPTIONS.length && (
            <span className="badge badge-morno" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Status ({selectedStatuses.size})
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSelectedStatuses(new Set())} />
            </span>
          )}

          {selectedCulturas.size > 0 && selectedCulturas.size < CULTURA_OPTIONS.length && (
            <span className="badge badge-frio" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Culturas ({selectedCulturas.size})
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSelectedCulturas(new Set())} />
            </span>
          )}

          {selectedProdutores.size > 0 && selectedProdutores.size < PRODUTORES_OPTIONS.length && (
            <span className="badge badge-morno" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Produtores ({selectedProdutores.size})
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSelectedProdutores(new Set())} />
            </span>
          )}

          {selectedEquipes.size > 0 && selectedEquipes.size < EQUIPE_OPTIONS.length && (
            <span className="badge badge-frio" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Equipes ({selectedEquipes.size})
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSelectedEquipes(new Set())} />
            </span>
          )}

          {selectedMomentos.size > 0 && selectedMomentos.size < MOMENTO_OPTIONS.length && (
            <span className="badge badge-quente" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Momentos ({selectedMomentos.size})
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSelectedMomentos(new Set())} />
            </span>
          )}

          {searchTerm && (
            <span className="badge badge-frio" style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              "{searchTerm}"
              <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
            </span>
          )}

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

                    {/* Localização & Praça */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>
                        <MapPin size={12} color="#4F8EF7" />
                        <span>{lead.Cidade} — {lead.Estado}</span>
                      </div>
                      {lead._praca ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                          <span style={{
                            background: 'rgba(34, 200, 122, 0.12)',
                            color: '#22C87A',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            📍 {lead._praca.codigo} · {lead._praca.dist_km === 0 ? 'Polo' : `${lead._praca.dist_km}km`}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            RC: <strong style={{ color: lead._praca.responsavel !== 'a definir' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{lead._praca.responsavel}</strong>
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.69rem', color: 'var(--text-muted)', opacity: 0.65 }}>
                          ⚡ Fora de raio (250km)
                        </span>
                      )}
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
