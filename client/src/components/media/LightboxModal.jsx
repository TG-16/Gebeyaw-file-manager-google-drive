import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize2 } from 'lucide-react';
import { getAuthToken, getMediaUrl } from '../../api/client';

export default function LightboxModal({ media, shareToken, allowDownload = true, onClose }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const authToken = getAuthToken();

  // Keep refs in sync for touch event handlers
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const positionRef = useRef(position);
  positionRef.current = position;

  // Touch gesture state ref
  const touchRef = useRef({
    isPinching: false,
    isDragging: false,
    startDistance: 0,
    startZoom: 1,
    startMidpoint: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    startDragPoint: { x: 0, y: 0 },
    lastTapTime: 0
  });

  const getTouchDistance = (t1, t2) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const getTouchMidpoint = (t1, t2) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') resetZoom();
    };
    window.addEventListener('keydown', handleKeyDown);

    const stageEl = stageRef.current;

    // Non-passive wheel listener
    const handleWheelNonPassive = (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoomLevel(prev => Math.min(prev + 0.25, 5.0));
      } else {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
      }
    };

    // Mobile Pinch-to-zoom & Touch gestures (Non-passive listeners)
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Two-finger pinch gesture start
        e.preventDefault();
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const mid = getTouchMidpoint(e.touches[0], e.touches[1]);
        touchRef.current.isPinching = true;
        touchRef.current.isDragging = false;
        touchRef.current.startDistance = dist;
        touchRef.current.startZoom = zoomLevelRef.current;
        touchRef.current.startMidpoint = mid;
        touchRef.current.startPosition = { ...positionRef.current };
        setIsInteracting(true);
      } else if (e.touches.length === 1) {
        const now = Date.now();
        const timeDiff = now - touchRef.current.lastTapTime;

        // Double-tap zoom toggle (like native phone gallery)
        if (timeDiff < 300) {
          e.preventDefault();
          touchRef.current.lastTapTime = 0;
          if (zoomLevelRef.current > 1.2) {
            setZoomLevel(1);
            setPosition({ x: 0, y: 0 });
            zoomLevelRef.current = 1;
            positionRef.current = { x: 0, y: 0 };
          } else {
            setZoomLevel(2.5);
            zoomLevelRef.current = 2.5;
          }
          return;
        }
        touchRef.current.lastTapTime = now;

        // One-finger drag when zoomed in
        if (zoomLevelRef.current > 1) {
          touchRef.current.isDragging = true;
          touchRef.current.startDragPoint = {
            x: e.touches[0].clientX - positionRef.current.x,
            y: e.touches[0].clientY - positionRef.current.y
          };
          setIsInteracting(true);
        }
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchRef.current.isPinching) {
        e.preventDefault();
        const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
        if (touchRef.current.startDistance > 0) {
          const scale = currentDist / touchRef.current.startDistance;
          const newZoom = Math.min(Math.max(touchRef.current.startZoom * scale, 0.5), 5.0);
          setZoomLevel(newZoom);
          zoomLevelRef.current = newZoom;

          // Shift position with pinch center
          const currentMid = getTouchMidpoint(e.touches[0], e.touches[1]);
          const dx = currentMid.x - touchRef.current.startMidpoint.x;
          const dy = currentMid.y - touchRef.current.startMidpoint.y;
          const newPos = {
            x: touchRef.current.startPosition.x + dx,
            y: touchRef.current.startPosition.y + dy
          };
          setPosition(newPos);
          positionRef.current = newPos;
        }
      } else if (e.touches.length === 1 && touchRef.current.isDragging && zoomLevelRef.current > 1) {
        e.preventDefault();
        const newPos = {
          x: e.touches[0].clientX - touchRef.current.startDragPoint.x,
          y: e.touches[0].clientY - touchRef.current.startDragPoint.y
        };
        setPosition(newPos);
        positionRef.current = newPos;
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length === 0) {
        touchRef.current.isPinching = false;
        touchRef.current.isDragging = false;
        setIsInteracting(false);

        // Snap back to 1x if pinched smaller than 1x
        if (zoomLevelRef.current < 1) {
          setZoomLevel(1);
          setPosition({ x: 0, y: 0 });
          zoomLevelRef.current = 1;
          positionRef.current = { x: 0, y: 0 };
        }
      } else if (e.touches.length === 1) {
        // Transition from 2 fingers to 1 finger
        touchRef.current.isPinching = false;
        if (zoomLevelRef.current > 1) {
          touchRef.current.isDragging = true;
          touchRef.current.startDragPoint = {
            x: e.touches[0].clientX - positionRef.current.x,
            y: e.touches[0].clientY - positionRef.current.y
          };
        }
      }
    };

    if (stageEl) {
      stageEl.addEventListener('wheel', handleWheelNonPassive, { passive: false });
      stageEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      stageEl.addEventListener('touchmove', handleTouchMove, { passive: false });
      stageEl.addEventListener('touchend', handleTouchEnd, { passive: false });
      stageEl.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (stageEl) {
        stageEl.removeEventListener('wheel', handleWheelNonPassive);
        stageEl.removeEventListener('touchstart', handleTouchStart);
        stageEl.removeEventListener('touchmove', handleTouchMove);
        stageEl.removeEventListener('touchend', handleTouchEnd);
        stageEl.removeEventListener('touchcancel', handleTouchEnd);
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
  const streamUrl = getMediaUrl(`/api/v1/media/${media.id}/stream${authParam ? `?${authParam}` : ''}`);
  const downloadUrl = getMediaUrl(`/api/v1/media/${media.id}/download${authParam ? `?${authParam}` : ''}`);

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
          if (e.target === e.currentTarget && zoomLevel <= 1 && !touchRef.current.isPinching) {
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
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
              transition: isInteracting ? 'none' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)'
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
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
              transition: isInteracting ? 'none' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)'
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
