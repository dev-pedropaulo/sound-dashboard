import React, { createContext, useContext, useState, useEffect } from 'react';

const PrivacyContext = createContext({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
  setPrivacyMode: () => {},
  maskPhone: (phone) => phone,
  maskEmail: (email) => email,
  maskText: (text, placeholder) => text,
});

const STORAGE_KEY = 'sound_privacy_mode';

export function PrivacyProvider({ children, onToggleNotice }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isPrivacyMode));
    } catch (e) {
      console.warn('Não foi possível salvar preferência de privacidade:', e);
    }

    if (isPrivacyMode) {
      document.body.classList.add('privacy-mode-active');
    } else {
      document.body.classList.remove('privacy-mode-active');
    }
  }, [isPrivacyMode]);

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      if (onToggleNotice) {
        onToggleNotice(next);
      }
      return next;
    });
  };

  const maskPhone = (phone) => {
    if (!isPrivacyMode || !phone) return phone;
    // Formato mascarado: (••) •••••-••••
    return '(••) •••••-••••';
  };

  const maskEmail = (email) => {
    if (!isPrivacyMode || !email) return email;
    const parts = email.split('@');
    if (parts.length === 2) {
      const [user, domain] = parts;
      const maskedUser = user.length > 2 ? `${user.slice(0, 1)}•••••` : '•••••';
      return `${maskedUser}@${domain}`;
    }
    return '••••••••@••••.com';
  };

  const maskText = (text, placeholder = '••••••••') => {
    if (!isPrivacyMode || !text) return text;
    return placeholder;
  };

  return (
    <PrivacyContext.Provider
      value={{
        isPrivacyMode,
        togglePrivacyMode,
        setPrivacyMode: setIsPrivacyMode,
        maskPhone,
        maskEmail,
        maskText,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy deve ser usado dentro de um PrivacyProvider');
  }
  return context;
}

/**
 * Componente para envelopar dados sensíveis com blur CSS e proteção contra cópia / vazamento visual
 */
export function SensitiveText({
  children,
  placeholder,
  className = '',
  style = {},
  tag: Tag = 'span',
  ...rest
}) {
  const { isPrivacyMode } = usePrivacy();

  if (!isPrivacyMode) {
    return <Tag className={className} style={style} {...rest}>{children}</Tag>;
  }

  return (
    <Tag
      className={`privacy-blur ${className}`.trim()}
      style={{
        filter: 'blur(5.5px)',
        userSelect: 'none',
        pointerEvents: 'none',
        display: 'inline-block',
        transition: 'filter 0.25s ease-in-out',
        ...style,
      }}
      title="Dado ocultado pelo Modo de Privacidade"
      aria-label="Dado protegido"
      {...rest}
    >
      {placeholder || children}
    </Tag>
  );
}
