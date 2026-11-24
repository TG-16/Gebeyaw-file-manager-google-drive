import React from 'react';
import { Folder, Trash2, Users, FolderPlus, Sun, Moon, LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose, currentView, onViewChange, onNewFolder }) {
  const { user, logout, theme, toggleTheme } = useAuth();

  const handleNav = (view) => {
    onViewChange(view);
    if (window.innerWidth < 900) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="brand-icon">
              <Folder size={18} />
            </div>
            <span>Family Archive</span>
          </div>

          <button 
            className="btn btn-ghost btn-sm modal-close-btn" 
            style={{ display: window.innerWidth >= 900 ? 'none' : 'flex' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 12px 6px' }}>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', gap: '8px' }}
            onClick={() => { onNewFolder(); if (window.innerWidth < 900) onClose(); }}
          >
            <FolderPlus size={18} />
            <span>New Folder</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-link ${currentView === 'folders' ? 'active' : ''}`}
            onClick={() => handleNav('folders')}
          >
            <Folder size={18} />
            <span>All Folders</span>
          </button>

          <button
            className={`nav-link ${currentView === 'trash' ? 'active' : ''}`}
            onClick={() => handleNav('trash')}
          >
            <Trash2 size={18} />
            <span>Trash (30 Days)</span>
          </button>

          {user?.role === 'admin' && (
            <button
              className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => handleNav('admin')}
            >
              <Users size={18} />
              <span>User Accounts</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Account'}</div>
              <div className="user-email">{user?.email || ''}</div>
            </div>
          </div>

          <button 
            className="btn btn-ghost btn-sm" 
            onClick={toggleTheme} 
            title="Toggle Dark/Light"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}
