import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare, RefreshCw, Copy, Check, ExternalLink,
  Search, Bot, User, ShieldAlert, Sparkles, Clock, Sliders,
  Info, ArrowDown, Database, Cpu
} from 'lucide-react';
import { fetchChatHistory, normalizeChatPhone } from '../services/chatService';
import { usePrivacy, SensitiveText } from '../context/PrivacyContext';

export default function ChatHistoryView({ lead, onOpenConfig }) {
  const { isPrivacyMode, maskPhone } = usePrivacy();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [notice, setNotice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const chatScrollRef = useRef(null);

  const rawPhone = lead?.WhatsApp || '';
  const { clean, withPlus } = normalizeChatPhone(rawPhone);

  const loadChat = async () => {
    if (!clean) return;
    try {
      setLoading(true);
      const res = await fetchChatHistory(clean, lead);
      setMessages(res.messages || []);
      setIsMock(Boolean(res.isMock));
      setNotice(res.notice || null);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChat();
  }, [clean, lead?.Id]);

  // Rolar para a última mensagem ao carregar
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Filtro de busca local nas mensagens
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;
    const term = searchTerm.toLowerCase();
    return messages.filter(m =>
      (m.content || '').toLowerCase().includes(term) ||
      (m.senderLabel || '').toLowerCase().includes(term)
    );
  }, [messages, searchTerm]);

  // Copiar histórico formatado para a área de transferência
  const handleCopyTranscript = () => {
    if (!messages || messages.length === 0) return;
    const header = `=== HISTÓRICO DE ATENDIMENTO SOUND AGRICULTURE ===\nLead: ${lead?.Nome || 'N/A'}\nEmpresa: ${lead?.['Nome da Empresa'] || 'N/A'}\nWhatsApp: ${rawPhone}\nSessão: ${clean}\nTabela: sound_n8n_chat_histories\nTotal de Mensagens: ${messages.length}\nData: ${new Date().toLocaleString('pt-BR')}\n------------------------------------------------\n\n`;
    
    const body = messages.map(m => {
      const time = m.timestamp ? `[${m.timestamp}] ` : '';
      const sender = m.sender === 'agent' ? '🤖 Agente IA Sound' : `👤 ${m.senderLabel || 'Lead'}`;
      return `${time}${sender}:\n${m.content}\n`;
    }).join('\n');

    navigator.clipboard.writeText(header + body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Barra de Status e Controles Superiores */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Metadados da Sessão n8n */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: isMock ? 'rgba(245, 183, 49, 0.12)' : 'rgba(34, 200, 122, 0.15)',
            color: isMock ? '#F5B731' : '#22C87A',
            border: `1px solid ${isMock ? 'rgba(245, 183, 49, 0.3)' : 'rgba(34, 200, 122, 0.3)'}`
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isMock ? '#F5B731' : '#22C87A',
              boxShadow: isMock ? '0 0 6px #F5B731' : '0 0 8px #22C87A',
              display: 'inline-block'
            }} />
            {isMock ? 'Modo Demonstração / Simulado' : 'Postgres n8n Conectado'}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.73rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            <Database size={13} color="#4F8EF7" />
            <span>Tabela: <strong style={{ color: 'var(--text-secondary)' }}>sound_n8n_chat_histories</strong></span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.73rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            <Cpu size={13} color="#8B7CF8" />
            <span>Contexto: <strong style={{ color: 'var(--text-secondary)' }}>15 mensagens</strong></span>
          </div>
        </div>

        {/* Ações da Barra */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadChat}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Recarregar mensagens do Postgres"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Buscando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={handleCopyTranscript}
            disabled={messages.length === 0}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Copiar transcrição completa da conversa"
          >
            {copied ? <Check size={13} color="#22C87A" /> : <Copy size={13} />}
            <span>{copied ? 'Copiado!' : 'Copiar Histórico'}</span>
          </button>

          {onOpenConfig && (
            <button
              onClick={onOpenConfig}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
              title="Configurar Endpoint ou Workflow do n8n"
            >
              <Sliders size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Aviso de Modo Demonstração com Atalho para Instruções */}
      {isMock && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 183, 49, 0.12) 0%, rgba(79, 142, 247, 0.08) 100%)',
          border: '1px solid rgba(245, 183, 49, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Info size={17} color="#F5B731" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: '#F5B731', display: 'block', marginBottom: '2px' }}>
                Ativação do Webhook no n8n pendente:
              </strong>
              {notice || 'Exibindo conversa simulada baseada nas respostas do formulário.'}
              {' '}Para puxar as mensagens reais salvas na tabela <code style={{ color: '#4F8EF7' }}>sound_n8n_chat_histories</code>, basta importar o fluxo de 3 nós no seu n8n.
            </div>
          </div>
          {onOpenConfig && (
            <button
              onClick={onOpenConfig}
              className="btn btn-primary"
              style={{ fontSize: '0.74rem', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Ver Fluxo n8n
            </button>
          )}
        </div>
      )}

      {/* Barra de Filtro / Busca dentro da Conversa */}
      <div style={{ position: 'relative' }}>
        <Search
          size={14}
          color="var(--text-muted)"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={`Buscar mensagens de ${lead?.Nome || 'contato'}...`}
          style={{
            width: '100%',
            padding: '8px 12px 8px 34px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            outline: 'none',
          }}
        />
        {searchTerm && (
          <span style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)'
          }}>
            {filteredMessages.length} resultado(s)
          </span>
        )}
      </div>

      {/* Feed da Conversa (Estilo WhatsApp Moderno) */}
      <div
        ref={chatScrollRef}
        style={{
          background: 'rgba(5, 7, 13, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 18px',
          minHeight: '360px',
          maxHeight: '480px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
            gap: '10px',
            color: 'var(--text-muted)'
          }}>
            <RefreshCw size={26} className="spin" color="#4F8EF7" />
            <span style={{ fontSize: '0.82rem' }}>Carregando histórico do Postgres...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
            gap: '12px',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            <MessageSquare size={36} strokeWidth={1.5} color="var(--text-muted)" />
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nenhuma mensagem encontrada
            </div>
            <div style={{ fontSize: '0.78rem', maxWidth: '360px' }}>
              Não foram encontradas mensagens para a chave de sessão{' '}
              <code style={{ color: '#22C87A' }}>{clean || 'telefone'}</code> na tabela{' '}
              <code style={{ color: '#4F8EF7' }}>sound_n8n_chat_histories</code>.
            </div>
          </div>
        ) : (
          filteredMessages.map((msg, i) => {
            const isAgent = msg.sender === 'agent';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id || i} style={{
                  alignSelf: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '4px 12px',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {msg.content}
                </div>
              );
            }

            return (
              <div
                key={msg.id || i}
                style={{
                  display: 'flex',
                  flexDirection: isAgent ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: '10px',
                  maxWidth: '85%',
                  alignSelf: isAgent ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Avatar do Remetente */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isAgent
                    ? 'linear-gradient(135deg, #00946E 0%, #22C87A 100%)'
                    : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isAgent ? 'rgba(34, 200, 122, 0.4)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isAgent ? '#FFF' : '#4F8EF7',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  {isAgent ? <Bot size={16} /> : <User size={16} />}
                </div>

                {/* Balão de Mensagem */}
                <div style={{
                  background: isAgent
                    ? 'linear-gradient(135deg, rgba(0, 148, 110, 0.22) 0%, rgba(34, 200, 122, 0.12) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${isAgent ? 'rgba(34, 200, 122, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: isAgent ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  padding: '12px 16px',
                  position: 'relative',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}>
                  {/* Nome do Remetente */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '4px',
                  }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isAgent ? '#22C87A' : '#4F8EF7',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}>
                      {isAgent ? 'Sound Agriculture (IA n8n)' : (
                        <SensitiveText placeholder="••••••••">
                          {lead?.Nome || 'Lead'}
                        </SensitiveText>
                      )}
                    </span>

                    {msg.timestamp && (
                      <span style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <Clock size={10} />
                        {msg.timestamp}
                      </span>
                    )}
                  </div>

                  {/* Texto da Mensagem */}
                  <div style={{
                    fontSize: '0.86rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {isPrivacyMode && !isAgent ? (
                      <SensitiveText placeholder="[Mensagem privada protegida no Modo de Privacidade]">
                        {msg.content}
                      </SensitiveText>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé com Atalho Direto para o WhatsApp */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          WhatsApp do Lead:{' '}
          <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            <SensitiveText placeholder="(••) •••••-••••">
              {rawPhone || 'Não cadastrado'}
            </SensitiveText>
          </strong>
        </div>

        {clean && (
          <a
            href={isPrivacyMode ? undefined : `https://wa.me/${clean}?text=Olá%20${encodeURIComponent(lead?.Nome||'')}%2C%20aqui%20é%20da%20Sound%20Agriculture.`}
            target={isPrivacyMode ? undefined : "_blank"}
            rel={isPrivacyMode ? undefined : "noopener noreferrer"}
            className={`btn btn-whatsapp ${isPrivacyMode ? 'privacy-protected-action' : ''}`}
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
            title={isPrivacyMode ? 'WhatsApp desativado no Modo de Privacidade' : 'Abrir conversa no WhatsApp Web'}
            onClick={isPrivacyMode ? (e) => e.preventDefault() : undefined}
          >
            <ExternalLink size={13} />
            <span>Continuar Conversa no WhatsApp</span>
          </a>
        )}
      </div>

    </div>
  );
}
