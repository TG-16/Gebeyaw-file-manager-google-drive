import React, { useState, useRef, useEffect } from 'react';
import { Folder, MoreVertical, Edit2, Share2, CornerUpRight, Trash2 } from 'lucide-react';

export default function FolderCard({ folder, onClick, onRename, onMove, onShare, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  const dateFormatted = new Date(folder.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="folder-card" onClick={onClick}>
      <div className="folder-card-header">
        <div className="folder-icon">
          <Folder size={20} />
        </div>

        <div style={{ position: 'relative' }} ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            className="card-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Folder options"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="dropdown-menu">
              <button
                className="dropdown-item"
                onClick={() => { setMenuOpen(false); onRename(folder); }}
              >
                <Edit2 size={14} />
                <span>Rename</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => { setMenuOpen(false); onMove(folder); }}
              >
                <CornerUpRight size={14} />
                <span>Move to...</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => { setMenuOpen(false); onShare(folder); }}
              >
                <Share2 size={14} />
                <span>Share link</span>
              </button>
              <button
                className="dropdown-item danger"
                onClick={() => { setMenuOpen(false); onDelete(folder); }}
              >
                <Trash2 size={14} />
                <span>Move to Trash</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="folder-name">{folder.name}</div>
        <div className="folder-meta" style={{ marginTop: '6px' }}>
          <span>{dateFormatted}</span>
          <span>•</span>
          <span>{folder.object_count || 0} objects</span>
        </div>
      </div>
    </div>
  );
}
