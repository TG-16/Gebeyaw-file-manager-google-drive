import React from 'react';
import { X, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  detail = '',
  confirmLabel = 'Delete',
  confirmVariant = 'danger', // 'danger' | 'primary'
  loading = false,
  icon = 'trash' // 'trash' | 'warning'
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-full)',
                background: confirmVariant === 'danger' ? 'var(--color-danger-subtle)' : 'var(--color-amber-subtle)',
                color: confirmVariant === 'danger' ? 'var(--color-danger)' : 'var(--color-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {icon === 'trash' ? <Trash2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <h3 className="modal-title" style={{ fontSize: '1.08rem' }}>
              {title}
            </h3>
          </div>

          <button className="modal-close-btn" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '10px', paddingTop: '16px', paddingBottom: '16px' }}>
          <p style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            {message}
          </p>
          {detail && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {detail}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'} btn-sm`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
