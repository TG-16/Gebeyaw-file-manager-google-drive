import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Image, Video, Music, Trash2 } from 'lucide-react';

export default function CreateObjectModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEdit = false
}) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setNote(initialData.note || '');
      } else {
        setTitle('');
        setNote('');
      }
      setFiles([]);
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!isEdit && !note.trim() && files.length === 0) {
      setError('An object must have either a note or at least one media file.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('note', note);
      files.forEach((file) => {
        formData.append('files', file);
      });

      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save object');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Edit Object' : 'Create New Object'}</h3>
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
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1985 Vacation Memories, House Deed Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Note / Story (Optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Write notes, memories, or descriptions here..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                style={{ minHeight: '80px' }}
              />
              <span className="form-helper">Notes are saved directly in your personal database.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Attach Media (Photos, Audios, Videos)</label>
              <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
                <div className="dropzone-icon">
                  <Upload size={20} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Click to select photos, audios, or videos
                </div>
                <div className="form-helper">
                  Supports JPG, PNG, GIF, WEBP, MP3, WAV, M4A, MP4, MOV, WEBM (up to 50MB per file)
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  accept="image/*,audio/*,video/*"
                  onChange={handleFileChange}
                />
              </div>

              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'var(--color-surface-hover)',
                        borderRadius: '6px',
                        fontSize: '0.84rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        {file.type.startsWith('image/') ? <Image size={15} /> :
                         file.type.startsWith('video/') ? <Video size={15} /> : <Music size={15} />}
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        style={{ color: 'var(--color-danger)', padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Uploading & Saving...' : isEdit ? 'Save Changes' : 'Create Object'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
