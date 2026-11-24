import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Download, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import ConfirmModal from '../common/ConfirmModal';

export default function ShareModal({ isOpen, onClose, target, type = 'folder' }) {
  const [token, setToken] = useState('');
  const [allowDownload, setAllowDownload] = useState(false); // Default OFF
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  useEffect(() => {
    if (isOpen && target) {
      setCopied(false);
      // Fetch or initialize share link
      initShare();
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const initShare = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'folder' 
        ? `/share/folder/${target.id}` 
        : `/share/object/${target.id}`;

      const { data } = await api.post(endpoint, { allowDownload });
      setToken(data.token);
      setAllowDownload(data.allowDownload);
    } catch (e) {
      console.error('Error generating share link:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDownload = async (e) => {
    const newVal = e.target.checked;
    setAllowDownload(newVal);
    try {
      const endpoint = type === 'folder'
        ? `/share/folder/${target.id}`
        : `/share/object/${target.id}`;
      await api.patch(endpoint, { allowDownload: newVal });
    } catch (err) {
      console.error('Failed to update download permission:', err);
    }
  };

  const executeRevoke = async () => {
    setRevokeLoading(true);
    try {
      const endpoint = type === 'folder'
        ? `/share/folder/${target.id}`
        : `/share/object/${target.id}`;
      await api.delete(endpoint);
      setToken('');
      setConfirmRevoke(false);
      onClose();
    } catch (err) {
      console.error('Failed to revoke link:', err);
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleRevoke = () => {
    setConfirmRevoke(true);
  };

  const shareUrl = token ? `${window.location.origin}/share/${token}` : '';

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} color="var(--color-accent)" />
            <h3 className="modal-title">Share {type === 'folder' ? 'Folder' : 'Object'}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Anyone with this unique link can view{' '}
            <strong>"{type === 'folder' ? target.name : target.title}"</strong> without logging in.
          </p>

          <div className="form-group" style={{ marginTop: '10px' }}>
            <label className="form-label">Public Share Link</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={loading ? 'Generating link...' : shareUrl}
                className="form-input"
                style={{ background: 'var(--color-surface-hover)' }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={copyToClipboard}
                disabled={!token || loading}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-hover)',
              marginTop: '12px'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={15} />
                <span>Allow Viewers to Download Files</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Default is <strong>Off</strong> (read-only preview only, no download button).
              </div>
            </div>

            <input
              type="checkbox"
              id="allowDownloadToggle"
              checked={allowDownload}
              onChange={handleToggleDownload}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-accent)' }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {token ? (
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={handleRevoke}>
              Revoke Link
            </button>
          ) : <div />}

          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        onConfirm={executeRevoke}
        title="Revoke Share Link"
        message="Are you sure you want to revoke this public link?"
        detail="Anyone who currently has this link will immediately lose access."
        confirmLabel="Revoke Link"
        confirmVariant="danger"
        loading={revokeLoading}
      />
    </div>
  );
}
