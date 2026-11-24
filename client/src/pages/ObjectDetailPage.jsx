import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Edit2, Share2, Trash2, Plus, Download, Image, Video, Music, Calendar, Folder, Play } from 'lucide-react';
import api, { getAuthToken, getMediaUrl } from '../api/client';
import LightboxModal from '../components/media/LightboxModal';
import ShareModal from '../components/modals/ShareModal';
import CreateObjectModal from '../components/modals/CreateObjectModal';
import ConfirmModal from '../components/common/ConfirmModal';

export default function ObjectDetailPage({ objectId, onBack }) {
  const [object, setObject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState(null); // for lightbox
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const fileInputRef = useRef(null);
  const authToken = getAuthToken();

  const loadObject = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/objects/${objectId}`);
      setObject(data.object);
    } catch (e) {
      console.error('Failed to load object:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (objectId) {
      loadObject();
    }
  }, [objectId]);

  const handleUploadMedia = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      await api.post(`/objects/${objectId}/media`, formData);
      loadObject();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload files.');
    }
  };

  const handleDeleteMedia = (mediaId, fileName) => {
    setConfirmConfig({
      title: 'Delete Media File',
      message: `Delete "${fileName}"?`,
      detail: 'This will permanently remove the file from storage.',
      confirmLabel: 'Delete File',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/objects/${objectId}/media/${mediaId}`);
          setConfirmConfig(null);
          loadObject();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to delete file.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleDeleteObject = () => {
    setConfirmConfig({
      title: 'Move to Trash',
      message: `Move "${object.title}" to Trash?`,
      detail: 'You can restore this object anytime within 30 days.',
      confirmLabel: 'Move to Trash',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/objects/${objectId}`);
          setConfirmConfig(null);
          onBack();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to delete object.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleUpdateObject = async (formData) => {
    await api.patch(`/objects/${objectId}`, {
      title: formData.get('title'),
      note: formData.get('note')
    });
    loadObject();
  };

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading object details...</p>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="page-content">
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Folder</span>
        </button>
        <p style={{ marginTop: '20px', color: 'var(--color-danger)' }}>Object not found or has been moved to trash.</p>
      </div>
    );
  }

  const dateFormatted = new Date(object.created_at).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="page-content">
      {/* Top Action Bar */}
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
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to {object.folder_name || 'Folder'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsEditOpen(true)}>
            <Edit2 size={15} />
            <span>Edit</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsShareOpen(true)}>
            <Share2 size={15} />
            <span>Share</span>
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteObject}>
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Object Card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            {object.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              <span>Created {dateFormatted}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Folder size={14} />
              <span>{object.folder_name}</span>
            </span>
          </div>
        </div>

        {/* Note / Text Story Section */}
        {object.note && (
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--color-border-subtle)',
              background: 'var(--color-surface-hover)'
            }}
          >
            <h3 style={{ fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              Story & Notes
            </h3>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.05rem',
                lineHeight: 1.7,
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap'
              }}
            >
              {object.note}
            </div>
          </div>
        )}

        {/* Media Files Section */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
              Attached Media ({object.media?.length || 0})
            </h3>

            <div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={15} />
                <span>Add Files</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                accept="image/*,audio/*,video/*"
                onChange={handleUploadMedia}
              />
            </div>
          </div>

          {object.media?.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No media attached to this object yet.</p>
          ) : (
            <div className="media-gallery">
              {object.media?.map((m) => (
                <div key={m.id} className="media-item-box" onClick={() => setActiveMedia(m)}>
                  {m.media_type === 'photo' ? (
                    <img
                      src={getMediaUrl(`/api/v1/media/${m.id}/stream${authToken ? `?token=${authToken}` : ''}`)}
                      alt={m.original_name}
                      className="media-item-img"
                      loading="lazy"
                    />
                  ) : m.media_type === 'video' ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <video
                        src={getMediaUrl(`/api/v1/media/${m.id}/stream${authToken ? `?token=${authToken}` : ''}#t=0.1`)}
                        className="media-item-img"
                        muted
                        preload="metadata"
                      />
                      <div className="video-overlay-play">
                        <div className="video-play-btn">
                          <Play size={20} fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        textAlign: 'center'
                      }}
                    >
                      <Music size={32} color="var(--color-forest)" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                        {m.original_name}
                      </span>
                    </div>
                  )}

                  {/* Individual Media Action Toolbar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      display: 'flex',
                      gap: '4px',
                      zIndex: 10
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={getMediaUrl(`/api/v1/media/${m.id}/download${authToken ? `?token=${authToken}` : ''}`)}
                      download
                      className="btn-ghost"
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fff'
                      }}
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => handleDeleteMedia(m.id, m.original_name)}
                      style={{
                        padding: '4px',
                        borderRadius: '4px',
                        background: 'rgba(197, 48, 48, 0.8)',
                        color: '#fff'
                      }}
                      title="Delete file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal with Zoom */}
      {activeMedia && (
        <LightboxModal
          media={activeMedia}
          allowDownload={true}
          onClose={() => setActiveMedia(null)}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        target={object}
        type="object"
        onClose={() => setIsShareOpen(false)}
      />

      {/* Edit Object Modal */}
      <CreateObjectModal
        isOpen={isEditOpen}
        initialData={object}
        isEdit={true}
        onSubmit={handleUpdateObject}
        onClose={() => setIsEditOpen(false)}
      />

      {/* Confirmation Dialog */}
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
