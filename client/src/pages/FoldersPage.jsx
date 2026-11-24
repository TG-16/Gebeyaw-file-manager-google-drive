import React, { useState, useEffect } from 'react';
import { Plus, FolderPlus, ArrowUpDown, Search, Folder, FileText } from 'lucide-react';
import api from '../api/client';
import FolderCard from '../components/folders/FolderCard';
import ObjectCard from '../components/objects/ObjectCard';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import CreateFolderModal from '../components/modals/CreateFolderModal';
import CreateObjectModal from '../components/modals/CreateObjectModal';
import ShareModal from '../components/modals/ShareModal';
import MoveModal from '../components/modals/MoveModal';
import ConfirmModal from '../components/common/ConfirmModal';

export default function FoldersPage({
  currentFolderId,
  onNavigateFolder,
  onSelectObject,
  searchQuery
}) {
  const [loading, setLoading] = useState(true);
  const [folderData, setFolderData] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [objects, setObjects] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [sortBy, setSortBy] = useState('date_desc');

  // Modal states
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [isObjectModalOpen, setIsObjectModalOpen] = useState(false);
  const [editingObject, setEditingObject] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [shareType, setShareType] = useState('folder');
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveType, setMoveType] = useState('folder');
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load folder contents
  const loadFolderContents = async () => {
    setLoading(true);
    try {
      if (currentFolderId) {
        const [contentsRes, breadcrumbRes] = await Promise.all([
          api.get(`/folders/${currentFolderId}`),
          api.get(`/folders/${currentFolderId}/breadcrumb`)
        ]);
        setFolderData(contentsRes.data.folder);
        setSubfolders(contentsRes.data.subfolders || []);
        setObjects(contentsRes.data.objects || []);
        setBreadcrumb(breadcrumbRes.data.breadcrumb || []);
      } else {
        // Root view
        const { data } = await api.get('/folders');
        setFolderData(null);
        setSubfolders(data.folders || []);
        setObjects([]);
        setBreadcrumb([]);
      }
    } catch (e) {
      console.error('Failed to load folders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolderContents();
  }, [currentFolderId]);

  // Handle live search
  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery || !searchQuery.trim()) {
        setSearchResults(null);
        return;
      }
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      }
    };

    const timeout = setTimeout(handleSearch, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Sorting
  const sortedFolders = [...subfolders].sort((a, b) => {
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
    return new Date(b.created_at) - new Date(a.created_at); // date_desc
  });

  const sortedObjects = [...objects].sort((a, b) => {
    if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
    if (sortBy === 'name_desc') return b.title.localeCompare(a.title);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Folder Actions
  const handleCreateOrUpdateFolder = async (name) => {
    if (editingFolder) {
      await api.patch(`/folders/${editingFolder.id}`, { name });
    } else {
      await api.post('/folders', { name, parentId: currentFolderId });
    }
    loadFolderContents();
  };

  const handleDeleteFolder = (folder) => {
    setConfirmConfig({
      title: 'Move Folder to Trash',
      message: `Move folder "${folder.name}" and all contents to Trash?`,
      detail: 'Folders and objects can be restored from Trash within 30 days.',
      confirmLabel: 'Move to Trash',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/folders/${folder.id}`);
          setConfirmConfig(null);
          loadFolderContents();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to delete folder.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Object Actions
  const handleCreateOrUpdateObject = async (formData) => {
    if (editingObject) {
      await api.patch(`/objects/${editingObject.id}`, {
        title: formData.get('title'),
        note: formData.get('note')
      });
      // If there are files attached in edit mode, upload them
      const files = formData.getAll('files');
      if (files.length > 0 && files[0].name) {
        const fileForm = new FormData();
        files.forEach(f => fileForm.append('files', f));
        await api.post(`/objects/${editingObject.id}/media`, fileForm);
      }
    } else {
      formData.append('folderId', currentFolderId);
      await api.post('/objects', formData);
    }
    loadFolderContents();
  };

  const handleDeleteObject = (obj) => {
    setConfirmConfig({
      title: 'Move Object to Trash',
      message: `Move object "${obj.title}" to Trash?`,
      detail: 'You can restore this object from Trash within 30 days.',
      confirmLabel: 'Move to Trash',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/objects/${obj.id}`);
          setConfirmConfig(null);
          loadFolderContents();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to delete object.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  return (
    <div>
      <Breadcrumbs breadcrumb={breadcrumb} onNavigate={onNavigateFolder} />

      <div className="page-content">
        {/* Search Results Display */}
        {searchResults !== null ? (
          <div>
            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} color="var(--color-accent)" />
              <h2 style={{ fontSize: '1.2rem' }}>
                Search Results for "{searchQuery}" ({searchResults.length})
              </h2>
            </div>

            {searchResults.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No folders, objects, notes, or media matched your search.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {searchResults.map((res) => (
                  <div
                    key={`${res.type}-${res.id}`}
                    onClick={() => {
                      if (res.type === 'folder') {
                        onNavigateFolder(res.id);
                      } else if (res.type === 'object') {
                        onSelectObject(res.id);
                      } else if (res.type === 'media') {
                        onSelectObject(res.target_object_id);
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      {res.type === 'folder' ? <Folder size={18} color="var(--color-amber)" /> : <FileText size={18} color="var(--color-accent)" />}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{res.name}</div>
                        {res.snippet && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {res.snippet}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="badge badge-muted">{res.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Normal Folder View */
          <div>
            {/* Header Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <div>
                <h1 style={{ fontSize: '1.45rem' }}>
                  {folderData ? folderData.name : 'All Folders'}
                </h1>
                <p style={{ fontSize: '0.84rem', marginTop: '2px' }}>
                  {folderData
                    ? `${subfolders.length} subfolders, ${objects.length} objects`
                    : `${subfolders.length} top-level folders`}
                </p>
              </div>

              <div className="folder-toolbar-actions">
                <div className="sort-dropdown-wrap">
                  <ArrowUpDown size={14} color="var(--color-text-muted)" />
                  <select
                    className="form-select sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort order"
                  >
                    <option value="date_desc">Newest</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                  </select>
                </div>

                <button
                  className="btn btn-secondary btn-sm toolbar-action-btn"
                  onClick={() => { setEditingFolder(null); setIsFolderModalOpen(true); }}
                  title="New Folder"
                  aria-label="New Folder"
                >
                  <FolderPlus size={16} />
                  <span className="btn-label-desktop">New Folder</span>
                </button>

                {currentFolderId && (
                  <button
                    className="btn btn-primary btn-sm toolbar-action-btn"
                    onClick={() => { setEditingObject(null); setIsObjectModalOpen(true); }}
                    title="New Object"
                    aria-label="New Object"
                  >
                    <Plus size={16} />
                    <span className="btn-label-desktop">New Object</span>
                  </button>
                )}
              </div>
            </div>

            {/* Subfolders Section */}
            {sortedFolders.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div className="section-title">
                  <span>Folders</span>
                  <span>{sortedFolders.length}</span>
                </div>
                <div className="folder-grid">
                  {sortedFolders.map((f) => (
                    <FolderCard
                      key={f.id}
                      folder={f}
                      onClick={() => onNavigateFolder(f.id)}
                      onRename={(folder) => { setEditingFolder(folder); setIsFolderModalOpen(true); }}
                      onMove={(folder) => { setMoveTarget(folder); setMoveType('folder'); }}
                      onShare={(folder) => { setShareTarget(folder); setShareType('folder'); }}
                      onDelete={handleDeleteFolder}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Objects Section */}
            {currentFolderId && (
              <div>
                <div className="section-title">
                  <span>Objects</span>
                  <span>{sortedObjects.length}</span>
                </div>

                {sortedObjects.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      background: 'var(--color-surface)',
                      border: '1px dashed var(--color-border)',
                      borderRadius: 'var(--radius-lg)'
                    }}
                  >
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                      This folder has no objects yet.
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setEditingObject(null); setIsObjectModalOpen(true); }}
                    >
                      <Plus size={16} />
                      <span>Create First Object</span>
                    </button>
                  </div>
                ) : (
                  <div className="object-grid">
                    {sortedObjects.map((obj) => (
                      <ObjectCard
                        key={obj.id}
                        object={obj}
                        onClick={() => onSelectObject(obj.id)}
                        onEdit={(object) => { setEditingObject(object); setIsObjectModalOpen(true); }}
                        onMove={(object) => { setMoveTarget(object); setMoveType('object'); }}
                        onShare={(object) => { setShareTarget(object); setShareType('object'); }}
                        onDelete={handleDeleteObject}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Buttons for Mobile */}
      <div className="fab-container">
        {currentFolderId && (
          <button
            className="fab"
            title="Create Object"
            onClick={() => { setEditingObject(null); setIsObjectModalOpen(true); }}
          >
            <Plus size={24} />
          </button>
        )}
        <button
          className="fab"
          style={{ background: 'var(--color-amber)' }}
          title="Create Folder"
          onClick={() => { setEditingFolder(null); setIsFolderModalOpen(true); }}
        >
          <FolderPlus size={22} />
        </button>
      </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSubmit={handleCreateOrUpdateFolder}
        initialName={editingFolder?.name || ''}
        isEdit={!!editingFolder}
      />

      <CreateObjectModal
        isOpen={isObjectModalOpen}
        onClose={() => setIsObjectModalOpen(false)}
        onSubmit={handleCreateOrUpdateObject}
        initialData={editingObject}
        isEdit={!!editingObject}
      />

      <ShareModal
        isOpen={!!shareTarget}
        target={shareTarget}
        type={shareType}
        onClose={() => setShareTarget(null)}
      />

      <MoveModal
        isOpen={!!moveTarget}
        target={moveTarget}
        type={moveType}
        onClose={() => setMoveTarget(null)}
        onMoved={loadFolderContents}
      />

      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={confirmConfig?.onConfirm}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        detail={confirmConfig?.detail}
        confirmLabel={confirmConfig?.confirmLabel}
        confirmVariant={confirmConfig?.confirmVariant}
        loading={actionLoading}
      />
    </div>
  );
}
