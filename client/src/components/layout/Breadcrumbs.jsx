import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ breadcrumb = [], onNavigate }) {
  return (
    <div className="breadcrumb-bar">
      <button 
        className="breadcrumb-item btn-ghost" 
        onClick={() => onNavigate(null)}
        style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
      >
        <Home size={14} />
        <span>Root</span>
      </button>

      {breadcrumb.map((crumb, idx) => {
        const isLast = idx === breadcrumb.length - 1;
        return (
          <React.Fragment key={crumb.id}>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <button
              className={`breadcrumb-item ${isLast ? 'active' : ''} btn-ghost`}
              onClick={() => !isLast && onNavigate(crumb.id)}
              disabled={isLast}
              style={{
                cursor: isLast ? 'default' : 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                background: 'none'
              }}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
