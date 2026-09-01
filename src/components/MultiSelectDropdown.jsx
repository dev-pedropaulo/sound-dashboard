import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Filter } from 'lucide-react';

export default function MultiSelectDropdown({
  label = '',
  options = [],
  selectedValues = new Set(),
  onChange = () => {},
  placeholder = 'Todos',
  color = '#4F8EF7',
  icon: HeaderIcon = Filter,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalOptions = options.length;
  const selectedCount = selectedValues.size;

  const isAllSelected = selectedCount === 0 || selectedCount === totalOptions;

  const toggleItem = (id) => {
    const next = new Set(selectedValues);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    const allSet = new Set(options.map(o => o.id));
    onChange(allSet);
  };

  const handleClearAll = () => {
    onChange(new Set());
  };

  const getButtonText = () => {
    if (isAllSelected) return placeholder;
    if (selectedCount === 1) {
      const item = options.find(o => selectedValues.has(o.id));
      return item ? item.label : `${selectedCount} selecionado`;
    }
    return `${selectedCount} selecionados`;
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '7px 11px',
          background: !isAllSelected ? `${color}15` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${!isAllSelected ? color : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          color: !isAllSelected ? color : 'var(--text-secondary)',
          fontSize: '0.8rem',
          fontWeight: !isAllSelected ? '700' : '500',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <HeaderIcon size={13} color={!isAllSelected ? color : 'var(--text-muted)'} />
        <span>{getButtonText()}</span>
        {!isAllSelected && (
          <span style={{
            background: color,
            color: '#fff',
            fontSize: '0.66rem',
            fontWeight: '800',
            padding: '1px 5px',
            borderRadius: '99px',
            lineHeight: 1
          }}>
            {selectedCount}
          </span>
        )}
        <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--text-muted)' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 300,
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          padding: '8px',
          minWidth: '220px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            padding: '4px 8px 6px 8px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.04em' }}>
              {label || placeholder}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{ background: 'none', border: 'none', color: '#4F8EF7', fontSize: '0.68rem', cursor: 'pointer', fontWeight: '600' }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.68rem', cursor: 'pointer', fontWeight: '600' }}
              >
                Limpar
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {options.map(opt => {
              const isChecked = selectedValues.has(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleItem(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: isChecked ? 'rgba(255,255,255,0.06)' : 'transparent',
                    fontSize: '0.78rem',
                    color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => !isChecked && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => !isChecked && (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '3px',
                    border: `1px solid ${isChecked ? color : 'var(--border-medium)'}`,
                    background: isChecked ? color : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
