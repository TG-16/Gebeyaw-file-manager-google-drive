import React, { useState, useEffect } from 'react';
import { Folder, FileText, Download, Play, Music, Calendar } from 'lucide-react';
import api, { getMediaUrl } from '../api/client';
import LightboxModal from '../components/media/LightboxModal';

export default function SharedViewPage({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMedia, setActiveMedia] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);

  useEffect(() => {
    const loadShared = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/share/${token}`);
        setData(res.data);
        if (res.data.type === 'object') {
          setSelectedObject(res.data.object);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Shared item not found or has expired.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadShared();
    }
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading shared content...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '20px' }}>
        <div style={{ textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '36px', maxWidth: '440px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--color-danger)' }}>Link Expired or Invalid</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  const allowDownload = data.allowDownload;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div className="brand-icon">
            <Folder size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Family Archive</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Shared with you (Read-only{allowDownload ? ', download enabled' : ''})
            </div>
          </div>
        </div>

        {/* View Folder */}
        {data.type === 'folder' && !selectedObject && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.6rem', color: 'var(--color-text-primary)' }}>{data.folder.name}</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {data.objects.length} shared objects
              </p>
            </div>

            <div className="object-grid">
              {data.objects.map((obj) => (
                <div
                  key={obj.id}
                  className="object-card"
                  onClick={() => setSelectedObject(obj)}
                >
                  <div className="object-preview">
                    {obj.primaryMedia?.media_type === 'photo' ? (
                      <img
                        src={getMediaUrl(`/api/v1/media/${obj.primaryMedia.id}/stream?shareToken=${token}`)}
                        alt={obj.title}
                        className="object-preview-img"
                        loading="lazy"
                      />
                    ) : obj.primaryMedia?.media_type === 'video' ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <video
                          src={getMediaUrl(`/api/v1/media/${obj.primaryMedia.id}/stream?shareToken=${token}#t=0.1`)}
                          className="object-preview-img"
                          muted
                          preload="metadata"
                        />
                        <div className="video-overlay-play">
                          <div className="video-play-btn">
                            <Play size={20} fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    ) : obj.note ? (
                      <div className="note-preview-box">
                        <p>{obj.note.replace(/<[^>]+>/g, '')}</p>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <FileText size={28} />
                        <span style={{ fontSize: '0.78rem' }}>View Object</span>
                      </div>
                    )}
                  </div>

                  <div className="object-card-body">
                    <h3 className="object-title">{obj.title}</h3>
                    <div className="object-card-footer">
                      <span>{new Date(obj.created_at).toLocaleDateString()}</span>
                      {obj.media?.length > 0 && <span>{obj.media.length} files</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Individual Object Detail */}
        {selectedObject && (
          <div>
            {data.type === 'folder' && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedObject(null)}
                style={{ marginBottom: '16px' }}
              >
                ← Back to {data.folder.name}
              </button>
            )}

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
                <h1 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{selectedObject.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>
                  <Calendar size={14} />
                  <span>{new Date(selectedObject.created_at || selectedObject.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {selectedObject.note && (
                <div
                  style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    background: 'var(--color-surface-hover)'
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.05rem',
                      lineHeight: 1.7,
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {selectedObject.note}
                  </div>
                </div>
              )}

              {/* Media gallery */}
              {selectedObject.media?.length > 0 && (
                <div style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '0.98rem', marginBottom: '14px' }}>
                    Media Files ({selectedObject.media.length})
                  </h3>

                  <div className="media-gallery">
                    {selectedObject.media.map((m) => (
                      <div
                        key={m.id}
                        className="media-item-box"
                        onClick={() => setActiveMedia(m)}
                      >
                        {m.media_type === 'photo' ? (
                          <img
                            src={getMediaUrl(`/api/v1/media/${m.id}/stream?shareToken=${token}`)}
                            alt={m.original_name}
                            className="media-item-img"
                            loading="lazy"
                          />
                        ) : m.media_type === 'video' ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <video
                              src={getMediaUrl(`/api/v1/media/${m.id}/stream?shareToken=${token}#t=0.1`)}
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
                          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}>
                            <Music size={32} color="var(--color-forest)" />
                            <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>{m.original_name}</span>
                          </div>
                        )}

                        {/* Download button only shown if allowDownload is TRUE */}
                        {allowDownload && (
                          <div
                            style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 10 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={getMediaUrl(`/api/v1/media/${m.id}/download?shareToken=${token}`)}
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox with zoom */}
      {activeMedia && (
        <LightboxModal
          media={activeMedia}
          shareToken={token}
          allowDownload={allowDownload}
          onClose={() => setActiveMedia(null)}
        />
      )}
    </div>
  );
}
