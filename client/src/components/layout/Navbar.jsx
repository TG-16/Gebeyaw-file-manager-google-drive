import React from 'react';
import { Menu, Search, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onToggleSidebar, searchQuery, onSearchChange }) {
  const { user, logout, theme, toggleTheme } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="menu-toggle-btn" 
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search folders, objects, notes, media..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="topbar-right">
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user && (
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={logout} 
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
