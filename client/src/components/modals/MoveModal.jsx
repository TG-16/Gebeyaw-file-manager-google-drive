import React, { useState, useEffect } from 'react';
import { X, CornerUpRight, Folder } from 'lucide-react';
import api from '../../api/client';

export default function MoveModal({ isOpen, onClose, target, type = 'folder', onMoved }) {
  const [folders, setFolders] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllFolders();
      setSelectedParentId('');
    }
  }, [isOpen]);

  const loadAllFolders = async () => {
    try {
      const { data } = await api.get('/folders');
      setFolders(data.folders || []);
    } catch (e) {
      console.error('Error loading folders for move modal:', e);
    }
  };

  if (!isOpen || !target) return null;

  const handleMove = async () => {
    setLoading(true);
    try {
      if (type === 'folder') {
        await api.patch(`/folders/${target.id}`, {
          parentId: selectedParentId ? parseInt(selectedParentId, 10) : null
        });
      } else {
        await api.patch(`/objects/${target.id}/move`, {
          targetFolderId: parseInt(selectedParentId, 10)
        });
      }
      onMoved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to move item.');
    } finally {
      setLoading(false);
    }
  };

  // Filter out the folder itself to prevent cyclic dependency
  const availableFolders = folders.filter(f => type !== 'folder' || f.id !== target.id);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CornerUpRight size={18} color="var(--color-accent)" />
            <h3 className="modal-title">Move {type === 'folder' ? 'Folder' : 'Object'}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Choose where to move <strong>"{type === 'folder' ? target.name : target.title}"</strong>:
          </p>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Destination Folder</label>
            <select
              className="form-select"
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
            >
              {type === 'folder' && (
                <option value="">📁 Root (Top-level)</option>
              )}
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleMove}
            disabled={loading || (type === 'object' && !selectedParentId)}
          >
            {loading ? 'Moving...' : 'Move Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
