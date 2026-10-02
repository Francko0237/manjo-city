import React from 'react';

/**
 * Composant de dialogue stylé pour remplacer window.confirm
 * Usage: <ConfirmDialog
 *   isOpen={bool}
 *   title="Titre"
 *   message="Message"
 *   type="danger" | "warning" | "info"
 *   confirmLabel="Oui, supprimer"
 *   cancelLabel="Annuler"
 *   onConfirm={() => ...}
 *   onCancel={() => ...}
 * />
 */
const ConfirmDialog = ({ isOpen, title, message, type = 'danger', confirmLabel = 'Confirmer', cancelLabel = 'Annuler', onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const colors = {
    danger:  { icon: '🗑️', accent: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
    warning: { icon: '⚠️', accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    info:    { icon: 'ℹ️', accent: 'var(--color-primary)', bg: '#f0fdf4', border: '#bbf7d0' },
  };
  const c = colors[type] || colors.danger;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '360px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          animation: 'dialogSlideIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Header coloré */}
        <div style={{ background: c.bg, borderBottom: `1px solid ${c.border}`, padding: '1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '2.8rem', display: 'block', marginBottom: '0.5rem' }}>{c.icon}</span>
          <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>{title}</h3>
        </div>

        {/* Message */}
        <div style={{ padding: '1.2rem 1.5rem', color: '#4b5563', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1.6 }}>
          {message}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '0.75rem', padding: '0 1.5rem 1.5rem' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '12px',
              border: '2px solid #e5e7eb', background: 'white',
              color: '#6b7280', fontWeight: '600', fontSize: '0.95rem',
              cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '12px',
              border: 'none', background: c.accent,
              color: 'white', fontWeight: '600', fontSize: '0.95rem',
              cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialogSlideIn {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmDialog;
