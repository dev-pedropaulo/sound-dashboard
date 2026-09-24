import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import BrazilMap from './components/BrazilMap';
import ChartsSection from './components/ChartsSection';
import KanbanBoard from './components/KanbanBoard';
import LeadsTable from './components/LeadsTable';
import LeadDetailModal from './components/LeadDetailModal';
import NewLeadModal from './components/NewLeadModal';
import PracasModal from './components/PracasModal';
import LoginScreen from './components/LoginScreen';
import { fetchLeads, updateLead, createLead } from './services/nocodb';
import { getStoredPracas, buildCityIndex, getLeadPraca } from './services/pracasService';
import { checkAuth, logout, getCurrentUser } from './services/authService';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function App() {
  // Autenticação de Usuário Único
  const [isAuthenticated, setIsAuthenticated] = useState(() => checkAuth());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard'); // dashboard, map, kanban, table
  const [selectedState, setSelectedState] = useState(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  
  // Gestão de Praças Comerciais e RCs (raio 250km)
  const [pracas, setPracas] = useState(() => getStoredPracas());
  const [isPracasModalOpen, setIsPracasModalOpen] = useState(false);

  // Índice geográfico reativo das praças
  const cityIndex = useMemo(() => buildCityIndex(pracas), [pracas]);
  
  const [activeLeadDetail, setActiveLeadDetail] = useState(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Carregar dados iniciais do NocoDB (apenas se autenticado)
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLeads({ limit: 300 });
      setLeads(data);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os leads do NocoDB. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Atualizar status do lead
  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      // Atualização otimista
      setLeads(prev => prev.map(l => l.Id === leadId ? { ...l, Status_Lead: newStatus } : l));
      if (activeLeadDetail && activeLeadDetail.Id === leadId) {
        setActiveLeadDetail(prev => ({ ...prev, Status_Lead: newStatus }));
      }

      await updateLead(leadId, { Status_Lead: newStatus });
      showToast(`Status atualizado para "${newStatus}" com sucesso!`);
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar status', 'error');
      loadData(); // Reverter
    }
  };

  // Criar novo lead
  const handleCreateLead = async (leadData) => {
    try {
      await createLead(leadData);
      showToast('Novo parceiro cadastrado e pontuado com sucesso!');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Erro ao criar lead', 'error');
      throw err;
    }
  };

  // Filtragem pelo mapa (troca de aba para tabela ao clicar no estado se desejar, ou filtra na própria tela)
  const handleSelectState = (stateId) => {
    setSelectedState(stateId);
    if (stateId && currentTab === 'dashboard') {
      // Mantém no dashboard mas destaca
    }
  };

  // Se não estiver autenticado, exibe a tela de login
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 2000,
          background: 'var(--bg-surface-elevated)',
          border: `1px solid ${toastMessage.type === 'success' ? 'rgba(34,200,122,0.3)' : 'rgba(239,91,71,0.3)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '11px 16px',
          color: 'var(--text-primary)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          fontSize: '0.84rem',
          fontWeight: '600',
          animation: 'fadeIn 0.25s ease'
        }}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} color="#22C87A" />
          ) : (
            <AlertCircle size={16} color="#EF5B47" />
          )}
          {toastMessage.message}
        </div>
      )}

      {/* Header com Navegação e Conexão NocoDB */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onRefresh={loadData}
        loading={loading}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        totalLeads={leads.length}
        onOpenPracasModal={() => setIsPracasModalOpen(true)}
        pracasCount={pracas.length}
        onLogout={() => {
          logout();
          setIsAuthenticated(false);
          setCurrentUser(null);
        }}
        user={currentUser}
      />

      {/* Alerta de Erro de Conexão */}
      {error && (
        <div style={{
          margin: '0 20px 20px 20px',
          padding: '14px 20px',
          background: 'rgba(239, 91, 71, 0.1)',
          border: '1px solid rgba(239, 91, 71, 0.25)',
          borderRadius: 'var(--radius-md)',
          color: '#EF5B47',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Métricas Principais (Sempre visíveis no topo) */}
      <MetricCards
        leads={leads}
        activeFilter={selectedClassFilter}
        onFilterClassification={(cls) => {
          setSelectedClassFilter(cls);
          if (currentTab !== 'table' && currentTab !== 'dashboard') {
            setCurrentTab('table');
          }
        }}
      />

      {/* Conteúdo Principal conforme a aba */}
      <main style={{ flex: 1 }}>
        {loading && leads.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '100px 20px',
            color: 'var(--text-secondary)'
          }}>
            <Loader2 size={36} color="#3861FB" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
            <p style={{ fontSize: '0.95rem', fontWeight: '600' }}>Carregando dados da Sound Agriculture no NocoDB...</p>
          </div>
        ) : (
          <>
            {/* Aba 1: Dashboard Geral (Mapa + Gráficos) */}
            {currentTab === 'dashboard' && (
              <>
                <ChartsSection leads={leads} />
                <BrazilMap
                  leads={leads}
                  selectedState={selectedState}
                  onSelectState={handleSelectState}
                />
                <LeadsTable
                  leads={leads}
                  onUpdateStatus={handleUpdateStatus}
                  onOpenLeadDetail={setActiveLeadDetail}
                  selectedStateFilter={selectedState}
                  selectedClassFilter={selectedClassFilter}
                  pracas={pracas}
                  cityIndex={cityIndex}
                />
              </>
            )}

            {/* Aba 3: Pipeline CRM (Kanban) */}
            {currentTab === 'kanban' && (
              <KanbanBoard
                leads={leads}
                onUpdateStatus={handleUpdateStatus}
                onOpenLeadDetail={setActiveLeadDetail}
                pracas={pracas}
                cityIndex={cityIndex}
              />
            )}

            {/* Aba 4: Tabela Completa */}
            {currentTab === 'table' && (
              <LeadsTable
                leads={leads}
                onUpdateStatus={handleUpdateStatus}
                onOpenLeadDetail={setActiveLeadDetail}
                selectedStateFilter={selectedState}
                selectedClassFilter={selectedClassFilter}
                pracas={pracas}
                cityIndex={cityIndex}
              />
            )}
          </>
        )}
      </main>

      {/* Modais */}
      {activeLeadDetail && (
        <LeadDetailModal
          lead={activeLeadDetail}
          leadPraca={getLeadPraca(activeLeadDetail, cityIndex)}
          onClose={() => setActiveLeadDetail(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {isNewModalOpen && (
        <NewLeadModal
          onClose={() => setIsNewModalOpen(false)}
          onSubmit={handleCreateLead}
        />
      )}

      {/* Modal de Gestão & Importação de Praças */}
      <PracasModal
        isOpen={isPracasModalOpen}
        onClose={() => setIsPracasModalOpen(false)}
        pracas={pracas}
        onUpdatePracas={setPracas}
      />

      {/* Footer */}
      <footer style={{
        margin: '12px 20px 16px 20px',
        padding: '10px 20px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '0.73rem',
        color: 'var(--text-muted)'
      }}>
        <span><strong style={{ color: 'var(--text-secondary)' }}>Sound Agriculture</strong> · CRM de Recrutamento de Canais</span>
        <span>Tecnologia TRIGGER™</span>
      </footer>
    </div>
  );
}
