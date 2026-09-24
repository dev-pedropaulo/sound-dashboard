import React, { useState } from 'react';
import {
  Lock, User, Eye, EyeOff, ShieldCheck,
  AlertCircle, ArrowRight, CheckCircle2, Sparkles, KeyRound
} from 'lucide-react';
import { login } from '../services/authService';

// Logo oficial Sound Agriculture
function SoundLogoLarge() {
  return (
    <svg
      width="160"
      height="64"
      viewBox="0 0 152 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: '#fff', display: 'block', margin: '0 auto 16px auto' }}
    >
      <path fill="#00946E" d="M142.934 15.307c1.177 2.816 1.843 5.939 1.894 9.215.205-3.43 3.123-6.194 6.604-6.194v-6.195c-3.225 0-6.246 1.178-8.498 3.174z"/>
      <path fill="currentColor" d="M9.932 27.491c-6.4 0-9.88-3.89-9.932-9.112h5.12c.05 2.713 1.535 4.659 4.914 4.659 2.15 0 3.993-.973 3.993-3.072 0-2.048-1.791-3.277-5.375-4.556C4.863 14.027.768 12.082.768 7.73.768 2.867 4.608 0 9.522 0c5.785 0 9.062 3.788 9.062 8.14h-4.71c-.205-1.945-1.485-3.686-4.352-3.686-2.099 0-3.532 1.177-3.532 2.918 0 1.792 1.536 2.61 4.76 3.84 5.018 1.996 8.602 4.249 8.602 8.856-.052 4.915-4.096 7.423-9.42 7.423zM36.81 17.56c0-3.072-1.997-5.53-5.068-5.53-3.02 0-5.12 2.458-5.12 5.53s2.1 5.529 5.17 5.529c3.021 0 5.018-2.406 5.018-5.53zm-15.154 0c0-5.939 4.505-9.932 10.086-9.932 5.631 0 10.034 3.993 10.034 9.932 0 5.887-4.403 9.932-9.983 9.932-5.632 0-10.137-4.045-10.137-9.932zM44.59 18.84V8.038h5.17v9.982c0 3.38 1.69 4.966 4.045 4.966 2.048 0 3.942-1.433 3.942-4.863V8.038h5.17v19.044h-3.993l-.768-2.713-.307.41c-.87 1.125-2.252 2.712-5.785 2.712-4.351 0-7.474-2.969-7.474-8.651zM85.137 16.28v10.802h-5.17V17.15c0-3.378-1.741-4.965-4.096-4.965-2.048 0-3.993 1.433-3.993 4.863v10.034h-5.171V8.038h4.044l.768 2.764.307-.41c.87-1.126 2.304-2.713 5.888-2.713 4.198-.05 7.423 2.918 7.423 8.601zM102.337 17.509c0-3.226-1.843-5.478-4.556-5.478-2.765 0-4.71 2.252-4.71 5.478 0 3.225 1.945 5.477 4.71 5.477 2.713.052 4.556-2.252 4.556-5.477zm0-7.526V0h4.864v27.082h-3.789l-.716-2.713-.359.512c-1.024 1.33-2.61 2.56-5.427 2.56-4.76 0-8.754-3.84-8.754-9.83 0-6.143 4.096-9.983 8.96-9.983 2.457-.051 4.248.921 5.221 2.355z"/>
      <path fill="#5A4C9F" d="M139.965 10.137a17.559 17.559 0 00-4.249 4.658 18.493 18.493 0 012.969 10.086v2.662h6.195l-.052-2.713c0-5.478-1.791-10.598-4.863-14.693zM135.717 5.631A24.68 24.68 0 00120 0v6.195c4.3 0 8.294 1.484 11.468 3.941 1.228-1.689 2.662-3.174 4.249-4.505z"/>
      <path fill="#E0A527" d="M132.747 24.83v2.713h-6.194V24.83c0-3.584-2.969-6.553-6.553-6.553v-6.195c7.014 0 12.747 5.734 12.747 12.747z"/>
      <path fill="#C23B33" d="M128.498 15.307c2.509 2.253 4.147 5.478 4.249 9.113.256-10.085 8.55-18.225 18.686-18.225V.05c-10.29 0-19.198 6.297-22.935 15.256z"/>
    </svg>
  );
}

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = login(username, password, rememberMe);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error);
        setLoading(false);
      }
    }, 400); // feedback visual suave
  };

  const handleUseDemo = () => {
    setUsername('admin');
    setPassword('sound@2026');
    setError(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      position: 'relative',
      background: 'radial-gradient(circle at 50% 30%, #151A26 0%, #0C0E14 100%)'
    }}>
      {/* Background Decorativo */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(0, 148, 110, 0.12) 0%, rgba(79, 142, 247, 0.05) 50%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Card de Login */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 32px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        animation: 'fadeIn 0.3s ease'
      }}>
        {/* Topo / Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <SoundLogoLarge />
          <h1 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: '6px'
          }}>
            Portal de Inteligência de Canais
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Acesso restrito à equipe comercial e operacional da Sound Agriculture.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div style={{
            padding: '11px 14px',
            background: 'rgba(239, 91, 71, 0.12)',
            border: '1px solid rgba(239, 91, 71, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#EF5B47',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
            animation: 'fadeIn 0.2s ease'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Campo Usuário */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px'
            }}>
              Usuário ou E-mail
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 38px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, background 0.2s ease'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#00946E';
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-subtle)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px'
            }}>
              Senha de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Sua senha secreta"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, background 0.2s ease'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#00946E';
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-subtle)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Lembrar-me */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#00946E' }}
              />
              <span>Manter conectado neste dispositivo</span>
            </label>

            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3861FB',
                cursor: 'pointer',
                fontSize: '0.74rem',
                textDecoration: 'underline'
              }}
            >
              Credenciais padrão
            </button>
          </div>

          {/* Dica de Acesso Rápido */}
          {showHint && (
            <div style={{
              background: 'rgba(56, 97, 251, 0.08)',
              border: '1px solid rgba(56, 97, 251, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div>
                <div>Usuário: <code style={{ color: '#fff', fontWeight: 'bold' }}>admin</code></div>
                <div>Senha: <code style={{ color: '#22C87A', fontWeight: 'bold' }}>sound@2026</code></div>
              </div>
              <button
                type="button"
                onClick={handleUseDemo}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
              >
                Preencher
              </button>
            </div>
          )}

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '12px 18px',
              fontSize: '0.9rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px',
              background: 'linear-gradient(135deg, #00946E 0%, #22C87A 100%)',
              color: '#051b14',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0, 148, 110, 0.35)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Entrar no Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Rodapé do Card */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-muted)'
        }}>
          <span>Tecnologia TRIGGER™ · Sound Agriculture Brasil</span>
        </div>
      </div>
    </div>
  );
}
