import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import FoldersPage from './pages/FoldersPage';
import ObjectDetailPage from './pages/ObjectDetailPage';
import TrashPage from './pages/TrashPage';
import AdminPage from './pages/AdminPage';
import SharedViewPage from './pages/SharedViewPage';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import CreateFolderModal from './components/modals/CreateFolderModal';
import api from './api/client';

export default function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('folders'); // 'folders' | 'object' | 'trash' | 'admin'
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);

  // Helper to extract share token from path (/share/:token), hash (/#/share/:token), or query (?share=:token)
  const getShareToken = () => {
    // 1. Pathname check: /share/:token
    const pathMatch = window.location.pathname.match(/\/share\/([a-zA-Z0-9-]+)/);
    if (pathMatch) return pathMatch[1];

    // 2. Hash check: #/share/:token or #share/:token
    const hashMatch = window.location.hash.match(/#\/?share\/([a-zA-Z0-9-]+)/);
    if (hashMatch) return hashMatch[1];

    // 3. Search query check fallback: ?share=:token
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('share')) return urlParams.get('share');

    return null;
  };

  const [shareToken, setShareToken] = useState(() => getShareToken());

  useEffect(() => {
    const handleUrlChange = () => {
      setShareToken(getShareToken());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Public share link view
  if (shareToken) {
    return <SharedViewPage token={shareToken} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading application...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigateFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setSelectedObjectId(null);
    setCurrentView('folders');
  };

  const handleSelectObject = (objectId) => {
    setSelectedObjectId(objectId);
    setCurrentView('object');
  };

  const handleCreateRootFolder = async (name) => {
    await api.post('/folders', { name, parentId: currentFolderId });
    window.location.reload(); // Quick refresh or trigger reload
  };

  return (
    <div className="app-container">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === 'folders') {
            setSelectedObjectId(null);
          }
        }}
        onNewFolder={() => setIsNewFolderModalOpen(true)}
      />

      <div className="main-wrapper">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (q && currentView !== 'folders') {
              setCurrentView('folders');
            }
          }}
        />

        {currentView === 'folders' && (
          <FoldersPage
            currentFolderId={currentFolderId}
            onNavigateFolder={handleNavigateFolder}
            onSelectObject={handleSelectObject}
            searchQuery={searchQuery}
          />
        )}

        {currentView === 'object' && selectedObjectId && (
          <ObjectDetailPage
            objectId={selectedObjectId}
            onBack={() => {
              setSelectedObjectId(null);
              setCurrentView('folders');
            }}
          />
        )}

        {currentView === 'trash' && <TrashPage />}

        {currentView === 'admin' && <AdminPage />}
      </div>

      <CreateFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        onSubmit={handleCreateRootFolder}
      />
    </div>
  );
}
