import React, { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';

export default function CreateFolderModal({ isOpen, onClose, onSubmit, initialName = '', isEdit = false }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError('');
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={20} color="var(--color-accent)" />
            <h3 className="modal-title">{isEdit ? 'Rename Folder' : 'New Folder'}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '8px 12px', background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Folder Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Family Trips, Medical Notes, Recipes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
