import React, { useState } from 'react';
import { X, Flame, Sparkles, Snowflake, Plus, AlertCircle } from 'lucide-react';
import { calculateLeadScore } from '../services/nocodb';

export default function NewLeadModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    Nome: '',
    'Nome da Empresa': '',
    Cidade: '',
    Estado: 'Mato Grosso',
    estado_digitado: '',
    'Tipo Empresa': 'Distribuidor de insumos agrícolas',
    Cultura: 'Soja',
    qtd_produtores: 'Acima de 150 produtores',
    equipe: 'Equipe comercial e técnica',
    comercializacao_atual: 'Sim, já comercializamos essa categoria',
    momento_empresa: 'Quero fechar uma parceria agora',
    responsavel_portfolio: 'Sou o responsável pela decisão',
    WhatsApp: '',
    Email: '',
    Praca_Classe: 'Classe A'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const scorePreview = calculateLeadScore(formData);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.Nome || !formData['Nome da Empresa']) {
      setError('Por favor, informe pelo menos o Nome e a Empresa.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao cadastrar lead.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '0.82rem',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.74rem',
    color: 'var(--text-secondary)',
    marginBottom: '5px',
    fontWeight: '600'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div 
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-secondary)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Header do Form */}
        <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--sound-cream)' }}>
              Cadastrar Novo Canal / Lead
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Formulário oficial de triagem e qualificação de canais Sound Agriculture
            </p>
          </div>

          {/* Score Live Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`badge ${
              scorePreview.classification === 'Quente' ? 'badge-quente' :
              scorePreview.classification === 'Morno' ? 'badge-morno' : 'badge-frio'
            }`}>
              {scorePreview.classification === 'Quente' && <Flame size={14} />}
              {scorePreview.classification === 'Morno' && <Sparkles size={14} />}
              {(scorePreview.classification === 'Frio / Fora' || scorePreview.classification === 'Frio/Fora') && <Snowflake size={14} />}
              {scorePreview.classification}
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: '800' }}>
              {scorePreview.score} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 20 pts</span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            color: '#F87171',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dados de Contato Básicos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Nome do Contato *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Carlos Silveira"
                value={formData.Nome}
                onChange={(e) => handleChange('Nome', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Nome da Empresa / Revenda *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: AgroNorte Distribuição"
                value={formData['Nome da Empresa']}
                onChange={(e) => handleChange('Nome da Empresa', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                WhatsApp / Celular
              </label>
              <input
                type="text"
                placeholder="+55 (66) 99999-0000"
                value={formData.WhatsApp}
                onChange={(e) => handleChange('WhatsApp', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                E-mail
              </label>
              <input
                type="email"
                placeholder="contato@empresa.com.br"
                value={formData.Email}
                onChange={(e) => handleChange('Email', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Localização */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Cidade / Município Base
              </label>
              <input
                type="text"
                placeholder="Ex: Sorriso"
                value={formData.Cidade}
                onChange={(e) => handleChange('Cidade', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Em qual estado sua empresa atua principalmente?
              </label>
              <select
                value={formData.Estado}
                onChange={(e) => handleChange('Estado', e.target.value)}
                style={inputStyle}
              >
                <option value="Mato Grosso">Mato Grosso</option>
                <option value="Goiás">Goiás</option>
                <option value="Mato Grosso do Sul">Mato Grosso do Sul</option>
                <option value="Paraná">Paraná</option>
                <option value="Outro estado">Outro estado</option>
              </select>
            </div>
          </div>

          {formData.Estado === 'Outro estado' && (
            <div>
              <label style={labelStyle}>
                Digite o estado em que sua empresa atua:
              </label>
              <input
                type="text"
                placeholder="Ex: Bahia, Tocantins, Minas Gerais..."
                value={formData.estado_digitado}
                onChange={(e) => handleChange('estado_digitado', e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {/* Perguntas Oficiais do Questionário */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Sua empresa atua como:
              </label>
              <select
                value={formData['Tipo Empresa']}
                onChange={(e) => handleChange('Tipo Empresa', e.target.value)}
                style={inputStyle}
              >
                <option value="Distribuidor de insumos agrícolas">Distribuidor de insumos agrícolas</option>
                <option value="Revenda de insumos agrícolas">Revenda de insumos agrícolas</option>
                <option value="Cooperativa">Cooperativa</option>
                <option value="Representante comercial (RC)">Representante comercial (RC)</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Quais culturas sua empresa atende mais?
              </label>
              <select
                value={formData.Cultura}
                onChange={(e) => handleChange.Cultura ? handleChange('Cultura', e.target.value) : handleChange('Cultura', e.target.value)}
                style={inputStyle}
              >
                <option value="Soja">🌱 Soja</option>
                <option value="Milho">🌽 Milho</option>
                <option value="Algodão">☁️ Algodão</option>
                <option value="Outras culturas">🌾 Outras culturas</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Quantos produtores sua empresa atende hoje?
              </label>
              <select
                value={formData.qtd_produtores}
                onChange={(e) => handleChange('qtd_produtores', e.target.value)}
                style={inputStyle}
              >
                <option value="Até 50 produtores">Até 50 produtores</option>
                <option value="De 51 a 150 produtores">De 51 a 150 produtores</option>
                <option value="Acima de 150 produtores">Acima de 150 produtores</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Sua empresa tem equipe para atendimento no campo?
              </label>
              <select
                value={formData.equipe}
                onChange={(e) => handleChange('equipe', e.target.value)}
                style={inputStyle}
              >
                <option value="Equipe comercial e técnica">Equipe comercial e técnica</option>
                <option value="Somente equipe comercial">Somente equipe comercial</option>
                <option value="Somente equipe técnica">Somente equipe técnica</option>
                <option value="Ainda estamos estruturando a equipe">Ainda estamos estruturando a equipe</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Sua empresa já comercializa produtos de nutrição, fisiologia ou eficiência?
              </label>
              <select
                value={formData.comercializacao_atual}
                onChange={(e) => handleChange('comercializacao_atual', e.target.value)}
                style={inputStyle}
              >
                <option value="Sim, já comercializamos essa categoria">Sim, já comercializamos essa categoria</option>
                <option value="Ainda não, mas queremos incluir no portfólio">Ainda não, mas queremos incluir no portfólio</option>
                <option value="Estamos conhecendo novas tecnologias antes de decidir">Estamos conhecendo novas tecnologias antes de decidir</option>
                <option value="Não temos interesse nessa categoria hoje">Não temos interesse nessa categoria hoje</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Qual é o momento da sua empresa em relação a novos fornecedores?
              </label>
              <select
                value={formData.momento_empresa}
                onChange={(e) => handleChange('momento_empresa', e.target.value)}
                style={inputStyle}
              >
                <option value="Quero fechar uma parceria agora">Quero fechar uma parceria agora</option>
                <option value="Estou avaliando fornecedores">Estou avaliando fornecedores</option>
                <option value="Só conhecendo o mercado">Só conhecendo o mercado</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Você é responsável pela decisão de portfólio da empresa?
            </label>
            <select
              value={formData.responsavel_portfolio}
              onChange={(e) => handleChange('responsavel_portfolio', e.target.value)}
              style={inputStyle}
            >
              <option value="Sou o responsável pela decisão">Sou o responsável pela decisão</option>
              <option value="Não sou o responsável">Não sou o responsável</option>
            </select>
          </div>

          {/* Botões do Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>{submitting ? 'Salvando no NocoDB...' : 'Salvar e Pontuar Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
