import React, { useState } from 'react';
import {
  X, Check, Copy, Sliders, Database, Cpu, Globe,
  RefreshCw, Terminal, CheckCircle2, AlertCircle, ExternalLink
} from 'lucide-react';
import {
  getChatApiUrl, saveChatApiUrl, testChatWebhookConnection,
  N8N_CHAT_WORKFLOW_TEMPLATE
} from '../services/chatService';

export default function ChatConfigModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [apiUrl, setApiUrl] = useState(() => getChatApiUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSave = () => {
    saveChatApiUrl(apiUrl);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testChatWebhookConnection(apiUrl);
      setTestResult(res);
    } catch (err) {
      setTestResult({ ok: false, message: err.message, status: 0 });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyWorkflow = () => {
    navigator.clipboard.writeText(JSON.stringify(N8N_CHAT_WORKFLOW_TEMPLATE, null, 2));
    setCopiedWorkflow(true);
    setTimeout(() => setCopiedWorkflow(false), 3000);
  };

  const sqlQuery = `SELECT id, session_id, message 
FROM sound_n8n_chat_histories 
WHERE session_id = '{{ $json.query.phone }}'
   OR session_id = '{{ $json.query.withPlus }}'
   OR session_id LIKE '%' || '{{ $json.query.last8 || ($json.query.phone || "").slice(-8) }}'
   OR session_id LIKE '%' || '{{ $json.query.last9 || ($json.query.phone || "").slice(-9) }}'
ORDER BY id ASC;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
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
          maxWidth: '740px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(34, 200, 122, 0.2) 0%, rgba(79, 142, 247, 0.2) 100%)',
              border: '1px solid rgba(34, 200, 122, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C87A'
            }}>
              <Database size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Integração n8n & Postgres Chat History
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tabela: <code style={{ color: '#4F8EF7' }}>sound_n8n_chat_histories</code> · VPS Easypanel
              </div>
            </div>
          </div>

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
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Configuração do Endpoint de Webhook */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px'
            }}>
              URL do Webhook n8n (GET Histórico)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="https://agentesn8n-n8n.cqc86v.easypanel.host/webhook/sound-chat-history"
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSave}
                className="btn btn-primary"
                style={{ padding: '9px 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                {savedSuccess ? 'Salvo!' : 'Salvar URL'}
              </button>
              <button
                onClick={handleTest}
                disabled={testing}
                className="btn btn-secondary"
                style={{ padding: '9px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={testing ? 'spin' : ''} />
                <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
              </button>
            </div>

            {testResult && (
              <div style={{
                marginTop: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: testResult.ok ? 'rgba(34, 200, 122, 0.12)' : 'rgba(239, 91, 71, 0.12)',
                border: `1px solid ${testResult.ok ? 'rgba(34, 200, 122, 0.3)' : 'rgba(239, 91, 71, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: testResult.ok ? '#22C87A' : '#EF5B47',
              }}>
                {testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Guia Rápido: Como Ativar no n8n */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Como ativar o Webhook no seu n8n (1 minuto)
              </div>
              <button
                onClick={handleCopyWorkflow}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copiedWorkflow ? <Check size={13} color="#22C87A" /> : <Copy size={13} />}
                <span>{copiedWorkflow ? 'JSON Copiado!' : 'Copiar JSON do Workflow'}</span>
              </button>
            </div>

            <ol style={{
              margin: '0 0 16px 18px',
              padding: 0,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7
            }}>
              <li>
                Acesse o n8n na sua VPS (
                <a
                  href="https://agentesn8n-n8n.cqc86v.easypanel.host"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4F8EF7', textDecoration: 'underline' }}
                >
                  agentesn8n-n8n.cqc86v.easypanel.host
                </a>
                ).
              </li>
              <li>Crie um novo workflow ou abra uma nova aba de tela em branco.</li>
              <li>
                Clique no botão <strong>"Copiar JSON do Workflow"</strong> acima e cole diretamente na tela do n8n com <strong>Ctrl + V</strong>.
              </li>
              <li>
                O fluxo vem pronto com 3 nós:
                <ul style={{ margin: '4px 0 4px 18px' }}>
                  <li><strong>Webhook GET</strong>: rota <code>sound-chat-history</code></li>
                  <li><strong>Postgres Query Memory</strong>: já configurado com a credencial existente <code>Postgres account</code></li>
                  <li><strong>Retornar JSON Histórico</strong>: responde com as mensagens e CORS habilitado</li>
                </ul>
              </li>
              <li>Ative o workflow clicando no toggle <strong>"Active"</strong> no canto superior direito do n8n. Pronto!</li>
            </ol>

            {/* Consulta SQL Embutida */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px'
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Query SQL Executada na Tabela sound_n8n_chat_histories:
                </span>
                <button
                  onClick={handleCopySql}
                  style={{
                    background: 'none', border: 'none', color: '#4F8EF7',
                    cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {copiedSql ? <Check size={11} color="#22C87A" /> : <Copy size={11} />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                color: '#22C87A',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {sqlQuery}
              </pre>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
