import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Folder, FileText, Calendar } from 'lucide-react';
import api from '../api/client';
import ConfirmModal from '../components/common/ConfirmModal';

export default function TrashPage() {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/trash');
      setTrashItems(data.trash || []);
    } catch (e) {
      console.error('Failed to load trash:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const handleRestore = async (item) => {
    try {
      await api.post(`/trash/${item.id}/restore?type=${item.item_type}`);
      loadTrash();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to restore item.');
    }
  };

  const handlePermanentDelete = (item) => {
    setConfirmConfig({
      title: 'Permanently Delete',
      message: `Permanently delete "${item.name}"?`,
      detail: 'This action cannot be undone. All attached media will be deleted from storage immediately.',
      confirmLabel: 'Permanently Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/trash/${item.id}?type=${item.item_type}`);
          setConfirmConfig(null);
          loadTrash();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to permanently delete item.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleEmptyTrash = () => {
    setConfirmConfig({
      title: 'Empty Trash',
      message: 'Are you sure you want to permanently delete ALL items in the trash?',
      detail: 'This will permanently remove all trashed files from Google Drive and MySQL. This cannot be undone.',
      confirmLabel: 'Empty All Trash',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete('/trash');
          setConfirmConfig(null);
          loadTrash();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to empty trash.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  return (
    <div className="page-content">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.45rem' }}>Trash</h1>
          <p style={{ fontSize: '0.84rem', marginTop: '2px', color: 'var(--color-text-secondary)' }}>
            Items are permanently deleted after 30 days.
          </p>
        </div>

        {trashItems.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={handleEmptyTrash}>
            <Trash2 size={15} />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading trash items...</p>
      ) : trashItems.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <Trash2 size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3>Trash is empty</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Deleted folders and objects will appear here before being removed permanently.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {trashItems.map((item) => (
            <div
              key={`${item.item_type}-${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xs)',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                {item.item_type === 'folder' ? (
                  <Folder size={22} color="var(--color-amber)" />
                ) : (
                  <FileText size={22} color="var(--color-accent)" />
                )}

                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.item_type}</span>
                    <span>•</span>
                    <span className="badge badge-accent">
                      {item.days_remaining} days remaining
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleRestore(item)}
                  title="Restore"
                >
                  <RotateCcw size={15} />
                  <span>Restore</span>
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-danger)' }}
                  onClick={() => handlePermanentDelete(item)}
                  title="Permanently Delete"
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={confirmConfig?.onConfirm}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        detail={confirmConfig?.detail}
        confirmLabel={confirmConfig?.confirmLabel}
        confirmVariant={confirmConfig?.confirmVariant}
        loading={actionLoading}
      />
    </div>
  );
}
