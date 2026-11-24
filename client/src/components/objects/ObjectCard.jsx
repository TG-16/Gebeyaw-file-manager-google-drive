import React, { useState, useRef, useEffect } from 'react';
import { Play, Music, FileText, MoreVertical, Edit2, Share2, CornerUpRight, Trash2, Paperclip } from 'lucide-react';
import { getAuthToken } from '../../api/client';

export default function ObjectCard({ object, onClick, onEdit, onMove, onShare, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const authToken = getAuthToken();

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const dateFormatted = new Date(object.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const primaryMedia = object.primaryMedia || (object.media && object.media[0]);
  const hasPhotos = object.media?.some(m => m.media_type === 'photo');
  const hasVideos = object.media?.some(m => m.media_type === 'video');
  const hasAudios = object.media?.some(m => m.media_type === 'audio');

  // Strip HTML for note snippet preview
  const plainNote = object.note ? object.note.replace(/<[^>]+>/g, '').trim() : '';

  return (
    <div className="object-card" onClick={onClick}>
      <div className="object-preview">
        {primaryMedia?.media_type === 'photo' ? (
          <img
            src={`/api/v1/media/${primaryMedia.id}/stream${authToken ? `?token=${authToken}` : ''}`}
            alt={object.title}
            className="object-preview-img"
            loading="lazy"
          />
        ) : primaryMedia?.media_type === 'video' ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* First frame preview via video element with preload */}
            <video
              src={`/api/v1/media/${primaryMedia.id}/stream${authToken ? `?token=${authToken}` : ''}#t=0.1`}
              preload="metadata"
              className="object-preview-img"
              muted
            />
            <div className="video-overlay-play">
              <div className="video-play-btn">
                <Play size={20} fill="currentColor" />
              </div>
            </div>
          </div>
        ) : primaryMedia?.media_type === 'audio' ? (
          <div className="audio-preview-box">
            <Music size={28} />
            <div className="waveform-animation">
              <div className="waveform-bar" style={{ height: '8px' }} />
              <div className="waveform-bar" style={{ height: '18px' }} />
              <div className="waveform-bar" style={{ height: '24px' }} />
              <div className="waveform-bar" style={{ height: '14px' }} />
              <div className="waveform-bar" style={{ height: '20px' }} />
              <div className="waveform-bar" style={{ height: '10px' }} />
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>Audio Note</span>
          </div>
        ) : plainNote ? (
          <div className="note-preview-box">
            <p>{plainNote}</p>
          </div>
        ) : (
          <div style={{ color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <FileText size={32} />
            <span style={{ fontSize: '0.78rem' }}>Empty object</span>
          </div>
        )}
      </div>

      <div className="object-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <h3 className="object-title">{object.title}</h3>
          
          <div style={{ position: 'relative' }} ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              className="card-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Object options"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => { setMenuOpen(false); onEdit(object); }}
                >
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => { setMenuOpen(false); onMove(object); }}
                >
                  <CornerUpRight size={14} />
                  <span>Move to...</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => { setMenuOpen(false); onShare(object); }}
                >
                  <Share2 size={14} />
                  <span>Share link</span>
                </button>
                <button
                  className="dropdown-item danger"
                  onClick={() => { setMenuOpen(false); onDelete(object); }}
                >
                  <Trash2 size={14} />
                  <span>Move to Trash</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="object-card-footer">
          <div className="object-tags">
            {object.media_count > 0 && (
              <span className="badge badge-muted" title={`${object.media_count} media file(s)`}>
                <Paperclip size={11} />
                <span>{object.media_count}</span>
              </span>
            )}
            {object.hasNote && (
              <span className="badge badge-accent" title="Includes text note">
                <FileText size={11} />
                <span>Note</span>
              </span>
            )}
          </div>
          <span>{dateFormatted}</span>
        </div>
      </div>
    </div>
  );
}
