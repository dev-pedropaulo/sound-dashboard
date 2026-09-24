import React, { useState, useMemo, useRef } from 'react';
import {
  X, MapPin, Upload, Download, RefreshCw, Plus, Edit2, Check,
  Search, AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  FileSpreadsheet, Users, Trash2, ArrowRight, ShieldCheck, Sparkles,
  BookOpen, Info, HelpCircle, Layers
} from 'lucide-react';
import {
  parsePracasExcel, exportPracasExcel, saveStoredPracas,
  resetToDefaultPracas, downloadPracasTemplate
} from '../services/pracasService';

export default function PracasModal({
  isOpen,
  onClose,
  pracas = [],
  onUpdatePracas
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'import' | 'new'
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPraca, setExpandedPraca] = useState(null);
  const [editingResp, setEditingResp] = useState(null); // { codigo, value }

  // Estados de importação
  const [importFile, setImportFile] = useState(null);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importMode, setImportMode] = useState('replace'); // 'replace' | 'merge'
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef(null);

  // Estados para nova praça manual
  const [newPraca, setNewPraca] = useState({
    codigo: '',
    nome: '',
    uf: 'MT',
    responsavel: ''
  });

  const [notification, setNotification] = useState(null);

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtragem de praças
  const filteredPracas = useMemo(() => {
    const s = searchTerm.toLowerCase();
    if (!s) return pracas;
    return pracas.filter(p =>
      p.nome?.toLowerCase().includes(s) ||
      p.codigo?.toLowerCase().includes(s) ||
      p.uf?.toLowerCase().includes(s) ||
      p.responsavel?.toLowerCase().includes(s) ||
      p.cidades?.some(c => c.cidade.toLowerCase().includes(s))
    );
  }, [pracas, searchTerm]);

  // Total de cidades cadastradas
  const totalCidades = useMemo(() => {
    return (pracas || []).reduce((acc, p) => acc + (p.cidades?.length || 0), 0);
  }, [pracas]);

  if (!isOpen) return null;

  // Salva edição de responsável (RC)
  const handleSaveResp = (codigo) => {
    if (!editingResp || editingResp.codigo !== codigo) return;
    const updated = pracas.map(p =>
      p.codigo === codigo ? { ...p, responsavel: editingResp.value.trim() || 'a definir' } : p
    );
    saveStoredPracas(updated);
    onUpdatePracas(updated);
    setEditingResp(null);
    showNotify(`Responsável da praça ${codigo} atualizado com sucesso!`);
  };

  // Exclui uma praça
  const handleDeletePraca = (codigo) => {
    if (!window.confirm(`Tem certeza que deseja remover a praça ${codigo}?`)) return;
    const updated = pracas.filter(p => p.codigo !== codigo);
    saveStoredPracas(updated);
    onUpdatePracas(updated);
    showNotify(`Praça ${codigo} removida.`);
  };

  // Processa arquivo selecionado
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);
    setImportLoading(true);

    try {
      const result = await parsePracasExcel(file);
      setParsedPreview(result);
    } catch (err) {
      setImportError(err.message || 'Erro ao processar planilha.');
      setParsedPreview(null);
    } finally {
      setImportLoading(false);
    }
  };

  // Confirma a importação
  const handleConfirmImport = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;

    let finalPracas = [];
    if (importMode === 'replace') {
      finalPracas = parsedPreview;
    } else {
      // Merge por código
      const map = {};
      pracas.forEach(p => { map[p.codigo] = p; });
      parsedPreview.forEach(p => { map[p.codigo] = p; });
      finalPracas = Object.values(map);
    }

    saveStoredPracas(finalPracas);
    onUpdatePracas(finalPracas);
    showNotify(`${finalPracas.length} praças configuradas com sucesso!`);
    setImportFile(null);
    setParsedPreview(null);
    setActiveTab('list');
  };

  // Criação manual de praça
  const handleCreateManual = (e) => {
    e.preventDefault();
    if (!newPraca.codigo || !newPraca.nome) {
      showNotify('Preencha Código e Nome da praça.', 'error');
      return;
    }

    const code = newPraca.codigo.trim().toUpperCase();
    if (pracas.some(p => p.codigo === code)) {
      showNotify(`Já existe uma praça com o código ${code}.`, 'error');
      return;
    }

    const created = {
      codigo: code,
      nome: newPraca.nome.trim(),
      uf: newPraca.uf.trim().toUpperCase(),
      responsavel: newPraca.responsavel.trim() || 'a definir',
      cidades: [
        { cidade: newPraca.nome.trim(), uf: newPraca.uf.trim().toUpperCase(), dist_km: 0 }
      ],
      total_cidades: 1
    };

    const updated = [...pracas, created];
    saveStoredPracas(updated);
    onUpdatePracas(updated);
    showNotify(`Praça ${created.nome} (${created.codigo}) adicionada!`);
    setNewPraca({ codigo: '', nome: '', uf: 'MT', responsavel: '' });
    setActiveTab('list');
  };

  // Restaura padrão
  const handleResetDefault = () => {
    if (!window.confirm('Deseja restaurar as 12 praças originais da Sound Agriculture? Modificações locais serão substituídas.')) return;
    const defaults = resetToDefaultPracas();
    onUpdatePracas(defaults);
    showNotify('Praças originais restauradas com sucesso!');
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(5, 7, 13, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        {/* Notificação Flutuante */}
        {notification && (
          <div style={{
            position: 'absolute', top: '16px', right: '20px', zIndex: 10,
            background: notification.type === 'error' ? 'rgba(239,91,71,0.95)' : 'rgba(34,200,122,0.95)',
            color: '#fff', padding: '8px 16px', borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)', animation: 'fadeIn 0.2s ease'
          }}>
            {notification.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            {notification.msg}
          </div>
        )}

        {/* Header do Modal */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{
                background: 'rgba(0, 148, 110, 0.15)',
                color: '#22C87A',
                padding: '6px',
                borderRadius: '8px'
              }}>
                <MapPin size={20} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Gestão & Importação de Praças Comerciais
              </h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Configure os polos de atuação, RCs responsáveis e o raio geográfico de 250 km para roteamento automático de leads.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              width: '32px', height: '32px',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Abas e Controles */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {/* Navegação de Abas */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('list')}
              className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              <Users size={14} />
              Praças Ativas ({pracas.length})
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              <Upload size={14} />
              Importar Planilha (.xlsx)
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`btn ${activeTab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              <Plus size={14} />
              Nova Praça
            </button>
          </div>

          {/* Ações Rápidas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => exportPracasExcel(pracas)}
              title="Baixar planilha Excel com todas as praças e cidades"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px' }}
            >
              <Download size={13} />
              Exportar Excel
            </button>
            <button
              onClick={handleResetDefault}
              title="Restaurar as 12 praças padrão da Sound Agriculture"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px', color: 'var(--text-muted)' }}
            >
              <RefreshCw size={13} />
              Restaurar Padrão
            </button>
          </div>
        </div>

        {/* Conteúdo da Aba */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* ABA 1: LISTA DE PRAÇAS */}
          {activeTab === 'list' && (
            <div>
              {/* Barra de Busca e Estatísticas */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Buscar praça, RC ou cidade..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 12px 7px 32px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total: <strong style={{ color: '#22C87A' }}>{pracas.length} praças</strong> · <strong style={{ color: 'var(--text-primary)' }}>{totalCidades} municípios</strong> mapeados no raio de 250 km
                </div>
              </div>

              {/* Tabela de Praças */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>CÓD</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>PRAÇA / POLO</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>UF</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>RC RESPONSÁVEL</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '600' }}>RAIO 250KM</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600' }}>AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPracas.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Nenhuma praça encontrada.
                        </td>
                      </tr>
                    ) : (
                      filteredPracas.map(p => {
                        const isExpanded = expandedPraca === p.codigo;
                        const isEditingThis = editingResp?.codigo === p.codigo;

                        return (
                          <React.Fragment key={p.codigo}>
                            <tr
                              style={{
                                borderBottom: '1px solid var(--border-subtle)',
                                background: isExpanded ? 'rgba(56, 97, 251, 0.05)' : 'transparent',
                                transition: 'background 0.1s ease'
                              }}
                            >
                              {/* Código */}
                              <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#3861FB' }}>
                                {p.codigo}
                              </td>

                              {/* Praça */}
                              <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {p.nome}
                              </td>

                              {/* UF */}
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{
                                  background: 'rgba(255,255,255,0.06)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: 'var(--text-secondary)'
                                }}>
                                  {p.uf}
                                </span>
                              </td>

                              {/* RC Responsável */}
                              <td style={{ padding: '11px 14px' }}>
                                {isEditingThis ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="text"
                                      value={editingResp.value}
                                      onChange={e => setEditingResp({ codigo: p.codigo, value: e.target.value })}
                                      placeholder="Nome do RC..."
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveResp(p.codigo);
                                        if (e.key === 'Escape') setEditingResp(null);
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        background: 'var(--bg-surface)',
                                        border: '1px solid #3861FB',
                                        borderRadius: 'var(--radius-sm)',
                                        color: '#fff',
                                        fontSize: '0.78rem',
                                        outline: 'none',
                                        width: '130px'
                                      }}
                                    />
                                    <button
                                      onClick={() => handleSaveResp(p.codigo)}
                                      style={{
                                        background: '#22C87A', border: 'none', color: '#000',
                                        borderRadius: '4px', padding: '4px 6px', cursor: 'pointer'
                                      }}
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      onClick={() => setEditingResp(null)}
                                      style={{
                                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-secondary)',
                                        borderRadius: '4px', padding: '4px 6px', cursor: 'pointer'
                                      }}
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      fontWeight: p.responsavel && p.responsavel !== 'a definir' ? 700 : 400,
                                      color: p.responsavel && p.responsavel !== 'a definir' ? '#22C87A' : 'var(--text-muted)'
                                    }}>
                                      {p.responsavel || 'a definir'}
                                    </span>
                                    <button
                                      onClick={() => setEditingResp({ codigo: p.codigo, value: p.responsavel === 'a definir' ? '' : p.responsavel })}
                                      title="Editar RC Responsável"
                                      style={{
                                        background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                        cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center'
                                      }}
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Cidades no Raio */}
                              <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                                <span style={{
                                  background: 'rgba(34, 200, 122, 0.1)',
                                  color: '#22C87A',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontWeight: 700,
                                  fontSize: '0.72rem'
                                }}>
                                  {p.cidades?.length || 0} cidades
                                </span>
                              </td>

                              {/* Ações */}
                              <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                  <button
                                    onClick={() => setExpandedPraca(isExpanded ? null : p.codigo)}
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.7rem', gap: '4px' }}
                                  >
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {isExpanded ? 'Ocultar' : 'Ver Cidades'}
                                  </button>
                                  <button
                                    onClick={() => handleDeletePraca(p.codigo)}
                                    title="Excluir praça"
                                    style={{
                                      background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                      cursor: 'pointer', padding: '4px', borderRadius: '4px'
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Dropdown com a lista de cidades no raio de 250km */}
                            {isExpanded && (
                              <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)' }}>
                                <td colSpan={6} style={{ padding: '14px 18px' }}>
                                  <div style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Municípios atendidos no raio de até 250 km de <strong>{p.nome} ({p.codigo})</strong>:</span>
                                    <span>RC Responsável: <strong>{p.responsavel}</strong></span>
                                  </div>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                    gap: '6px',
                                    maxHeight: '220px',
                                    overflowY: 'auto',
                                    padding: '8px',
                                    background: 'var(--bg-surface)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-subtle)'
                                  }}>
                                    {(p.cidades || []).map((c, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          fontSize: '0.73rem',
                                          padding: '4px 8px',
                                          background: 'rgba(255,255,255,0.03)',
                                          borderRadius: '4px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <span style={{ color: 'var(--text-primary)' }}>{c.cidade} - {c.uf}</span>
                                        <span style={{ color: '#22C87A', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 600 }}>
                                          {c.dist_km} km
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 2: IMPORTAR PLANILHA EXCEL */}
          {activeTab === 'import' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              {/* Card de Download do Template Modelo */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 200, 122, 0.08) 0%, rgba(56, 97, 251, 0.05) 100%)',
                border: '1px solid rgba(34, 200, 122, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px' }}>
                  <div style={{
                    background: 'rgba(34, 200, 122, 0.15)',
                    color: '#22C87A',
                    padding: '10px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      Baixar Planilha Modelo (.xlsx)
                    </h4>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                      Faça o download do template oficial pré-configurado com as colunas certas, abas de exemplo e formato alternativo em tabela única.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadPracasTemplate}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#22C87A',
                    background: 'rgba(34, 200, 122, 0.12)',
                    borderColor: 'rgba(34, 200, 122, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  Baixar Template
                </button>
              </div>

              {/* Seção Explicativa: Como Utilizar e Preencher a Planilha */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                marginBottom: '20px'
              }}>
                <div
                  onClick={() => setShowGuide(!showGuide)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      background: 'rgba(56, 97, 251, 0.15)',
                      color: '#3861FB',
                      padding: '7px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BookOpen size={17} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        Guia Explicativo: Como preencher e importar a planilha
                      </h4>
                      <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        Entenda as colunas necessárias, formatos aceitos e como o cálculo de 250 km funciona.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      fontSize: '0.73rem',
                      fontWeight: 600
                    }}
                  >
                    <span>{showGuide ? 'Ocultar guia' : 'Ver instruções'}</span>
                    {showGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* Conteúdo Expandido do Guia */}
                {showGuide && (
                  <div style={{
                    marginTop: '16px',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    {/* Passo a Passo Rápido */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                      gap: '10px'
                    }}>
                      {[
                        { step: '1', title: 'Baixar Modelo', desc: 'Clique em "Baixar Template" acima para ter a planilha base.' },
                        { step: '2', title: 'Preencher Dados', desc: 'Insira os polos, RCs, cidades e distâncias até 250 km.' },
                        { step: '3', title: 'Enviar Planilha', desc: 'Arraste o arquivo .xlsx para a caixa de upload abaixo.' },
                        { step: '4', title: 'Roteamento', desc: 'O sistema cruza as cidades e direciona os leads aos RCs.' },
                      ].map((item, i) => (
                        <div key={i} style={{
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 12px'
                        }}>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: '#3861FB', color: '#fff', fontSize: '0.7rem',
                            fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '6px'
                          }}>
                            {item.step}
                          </div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dicionário de Colunas */}
                    <div style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden'
                    }}>
                      <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Dicionário das Colunas da Planilha
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                        <tbody>
                          {[
                            { col: 'Praça', req: 'Sim', desc: 'Nome da cidade polo onde o RC fica sediado (ex: Sorriso, Londrina, Cascavel).' },
                            { col: 'UF', req: 'Sim', desc: 'Sigla de 2 letras do Estado federativo (ex: MT, GO, MS, PR).' },
                            { col: 'Código', req: 'Sim', desc: 'Sigla única de 3 ou 4 letras maiúsculas para identificar a praça (ex: SOR, LRV, CVL).' },
                            { col: 'Responsável', req: 'Opcional', desc: 'Nome do Representante Comercial (RC). Se ainda não tiver contratado, preencha com "a definir".' },
                            { col: 'Cidade', req: 'Sim', desc: 'Município pertencente ao raio de atendimento daquela praça.' },
                            { col: 'dist_km', req: 'Sim', desc: 'Distância rodoviária em km até o polo. A própria cidade polo deve ter dist_km = 0.' },
                          ].map((c, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#3861FB', width: '110px' }}>
                                {c.col}
                              </td>
                              <td style={{ padding: '7px 8px', color: c.req === 'Sim' ? '#22C87A' : 'var(--text-muted)', width: '70px', fontWeight: 600 }}>
                                {c.req}
                              </td>
                              <td style={{ padding: '7px 12px', color: 'var(--text-secondary)' }}>
                                {c.desc}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Dois Formatos Suportados */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22C87A', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                          <Layers size={14} />
                          Formato 1: Múltiplas Abas (Oficial)
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                          1ª aba chamada <strong>Resumo</strong> com os polos e seus RCs. Em seguida, uma aba para cada praça (ex: <code>SOR - Sorriso</code>) listando as cidades e <code>dist_km</code>.
                        </p>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4F8EF7', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
                          <FileSpreadsheet size={14} />
                          Formato 2: Tabela Única (Plano)
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                          Uma única planilha plana contendo todas as colunas juntas: <code>Código</code>, <code>Praça</code>, <code>UF</code>, <code>Responsável</code>, <code>Cidade</code> e <code>dist_km</code>.
                        </p>
                      </div>
                    </div>

                    {/* Dica de Funcionamento */}
                    <div style={{
                      background: 'rgba(56, 97, 251, 0.08)',
                      border: '1px solid rgba(56, 97, 251, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      fontSize: '0.73rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4'
                    }}>
                      <Info size={15} color="#3861FB" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Como o sistema usa esses dados:</strong> Quando um produtor ou canal preenche o formulário de captação, o sistema compara automaticamente o município informado com o mapa de 250 km. Se a cidade estiver na área de cobertura, o lead é vinculado instantaneamente à Praça e ao RC responsável.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                background: 'rgba(56, 97, 251, 0.05)',
                border: '1px dashed #3861FB',
                borderRadius: 'var(--radius-lg)',
                padding: '32px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                marginBottom: '20px'
              }}
              onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <FileSpreadsheet size={40} color="#3861FB" style={{ marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {importFile ? importFile.name : 'Clique para selecionar ou arraste sua planilha Excel (.xlsx)'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Suporta formato oficial com aba <strong>Resumo</strong> e abas das praças, ou planilha unificada com colunas de Praça, UF, Código, Responsável, Cidade e dist_km.
                </p>
              </div>

              {/* Status de Loading */}
              {importLoading && (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Lendo e estruturando dados geográficos...
                </div>
              )}

              {/* Erro de Leitura */}
              {importError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 91, 71, 0.1)',
                  border: '1px solid rgba(239, 91, 71, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#EF5B47',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <AlertCircle size={16} />
                  <span>{importError}</span>
                </div>
              )}

              {/* Prévia da Importação */}
              {parsedPreview && (
                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#22C87A', fontSize: '0.85rem', fontWeight: 700 }}>
                    <CheckCircle2 size={16} />
                    Planilha validada: {parsedPreview.length} praças detectadas
                  </div>

                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    fontSize: '0.75rem'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {parsedPreview.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', padding: '6px 10px' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 700, color: '#3861FB' }}>{p.codigo}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-primary)' }}>{p.nome} ({p.uf})</td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>RC: {p.responsavel}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: '#22C87A', fontWeight: 600 }}>{p.cidades?.length || 0} cidades</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Modo de Importação */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '0.8rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      Substituir todas as praças atuais
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                      />
                      Mesclar com praças existentes
                    </label>
                  </div>

                  {/* Botão de Confirmação */}
                  <button
                    onClick={handleConfirmImport}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                  >
                    <Check size={16} />
                    Confirmar Importação de {parsedPreview.length} Praças
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: NOVA PRAÇA MANUAL */}
          {activeTab === 'new' && (
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <form onSubmit={handleCreateManual} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      CÓDIGO (3-4 letras)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Ex: CGR"
                      value={newPraca.codigo}
                      onChange={e => setNewPraca(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                      style={{
                        width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700, outline: 'none'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      NOME DA PRAÇA / POLO
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Campo Grande"
                      value={newPraca.nome}
                      onChange={e => setNewPraca(prev => ({ ...prev, nome: e.target.value }))}
                      style={{
                        width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      ESTADO (UF)
                    </label>
                    <select
                      value={newPraca.uf}
                      onChange={e => setNewPraca(prev => ({ ...prev, uf: e.target.value }))}
                      style={{
                        width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                      }}
                    >
                      {['MT', 'GO', 'MS', 'PR', 'SP', 'MG', 'BA', 'TO', 'RO', 'RS', 'SC'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      RC RESPONSÁVEL
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Andrei ou a definir"
                      value={newPraca.responsavel}
                      onChange={e => setNewPraca(prev => ({ ...prev, responsavel: e.target.value }))}
                      style={{
                        width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                  Nota: Ao criar uma praça manualmente, ela é registrada inicialmente com a própria cidade polo a 0 km. Novas cidades no raio podem ser vinculadas via importação de planilha (.xlsx).
                </p>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 16px', fontSize: '0.85rem', marginTop: '8px' }}
                >
                  <Plus size={16} />
                  Cadastrar Praça
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
