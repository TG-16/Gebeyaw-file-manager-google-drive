import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize2 } from 'lucide-react';
import { getAuthToken } from '../../api/client';

export default function LightboxModal({ media, shareToken, allowDownload = true, onClose }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const authToken = getAuthToken();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') resetZoom();
    };
    window.addEventListener('keydown', handleKeyDown);

    // Non-passive wheel listener: allows e.preventDefault() so page doesn't scroll and no browser warning
    const stageEl = stageRef.current;
    const handleWheelNonPassive = (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoomLevel(prev => Math.min(prev + 0.25, 4.0));
      } else {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
      }
    };

    if (stageEl) {
      stageEl.addEventListener('wheel', handleWheelNonPassive, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (stageEl) {
        stageEl.removeEventListener('wheel', handleWheelNonPassive);
      }
    };
  }, []);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.35, 4.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.35, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const authParam = shareToken ? `shareToken=${shareToken}` : (authToken ? `token=${authToken}` : '');
  const streamUrl = `/api/v1/media/${media.id}/stream${authParam ? `?${authParam}` : ''}`;
  const downloadUrl = `/api/v1/media/${media.id}/download${authParam ? `?${authParam}` : ''}`;

  return (
    <div className="lightbox-modal">
      {/* Top Toolbar: Filename on left, Desktop controls center, Close button always pinned on far right */}
      <div className="lightbox-toolbar">
        <div className="lightbox-title-wrap">
          <span className="lightbox-filename" title={media.original_name}>
            {media.original_name}
          </span>
          <span className="lightbox-zoom-badge">
            ({Math.round(zoomLevel * 100)}%)
          </span>
        </div>

        {/* Desktop Controls (hidden on mobile) */}
        <div className="lightbox-controls lightbox-desktop-controls">
          <button className="lightbox-btn" onClick={handleZoomOut} title="Zoom out (-)">
            <ZoomOut size={18} />
          </button>
          <button className="lightbox-btn" onClick={handleZoomIn} title="Zoom in (+)">
            <ZoomIn size={18} />
          </button>
          <button className="lightbox-btn" onClick={handleRotate} title="Rotate 90°">
            <RotateCw size={18} />
          </button>
          <button className="lightbox-btn" onClick={resetZoom} title="Reset zoom (0)">
            <Maximize2 size={18} />
          </button>

          {allowDownload && (
            <a href={downloadUrl} download className="lightbox-btn" title="Download file">
              <Download size={18} />
            </a>
          )}
        </div>

        {/* Close Button: Always visible and reachable on right side */}
        <button
          className="lightbox-btn lightbox-close-btn"
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close fullscreen view"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Preview Stage */}
      <div
        ref={stageRef}
        className="lightbox-stage"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
          if (e.target === e.currentTarget && zoomLevel <= 1) {
            onClose();
          }
        }}
      >
        {media.media_type === 'photo' ? (
          <img
            src={streamUrl}
            alt={media.original_name}
            className="lightbox-zoom-target"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`
            }}
            draggable={false}
          />
        ) : media.media_type === 'video' ? (
          <video
            src={streamUrl}
            controls
            autoPlay
            className="lightbox-zoom-target"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`
            }}
          />
        ) : (
          <div style={{ background: '#222', padding: '30px', borderRadius: '12px' }}>
            <audio src={streamUrl} controls autoPlay style={{ width: '320px' }} />
          </div>
        )}
      </div>

      {/* Mobile Floating Action Bar (visible on mobile screens only) */}
      <div className="lightbox-mobile-controls">
        <button className="lightbox-btn" onClick={handleZoomOut} title="Zoom out">
          <ZoomOut size={16} />
        </button>
        <button className="lightbox-btn" onClick={handleZoomIn} title="Zoom in">
          <ZoomIn size={16} />
        </button>
        <button className="lightbox-btn" onClick={handleRotate} title="Rotate">
          <RotateCw size={16} />
        </button>
        <button className="lightbox-btn" onClick={resetZoom} title="Reset">
          <Maximize2 size={16} />
        </button>

        {allowDownload && (
          <a href={downloadUrl} download className="lightbox-btn" title="Download file">
            <Download size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
