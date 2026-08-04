'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check } from 'lucide-react';

const MAX_DISPLAY_W = 340;
const MAX_DISPLAY_H = 420;
const MIN_BOX = 40; // smallest crop box side, in display px

const HANDLES = ['tl', 'tr', 'bl', 'br'];
const ANCHOR_OF = { tl: 'br', tr: 'bl', bl: 'tr', br: 'tl' };
const CURSOR_OF = { tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize' };

export default function ImageCropModal({ file, aspect = 1, onConfirm, onCancel }) {
  const [imgUrl, setImgUrl] = useState('');
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 }); // crop box, in display px
  const [processing, setProcessing] = useState(false);

  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null); // { mode: 'move'|'resize', handle?, startX, startY, origBox }

  // Load file, read natural size, compute display size (contain-fit) and
  // an initial crop box centered at the largest size that fits the aspect.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(MAX_DISPLAY_W / img.naturalWidth, MAX_DISPLAY_H / img.naturalHeight);
      const dW = img.naturalWidth * scale;
      const dH = img.naturalHeight * scale;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setDisplaySize({ w: dW, h: dH });

      // Start the box smaller than the max possible size so there's room
      // to drag corners outward (expand) as well as inward (shrink).
      let maxBoxW, maxBoxH;
      if (dW / dH > aspect) {
        maxBoxH = dH;
        maxBoxW = dH * aspect;
      } else {
        maxBoxW = dW;
        maxBoxH = dW / aspect;
      }
      const START_FRACTION = 0.7;
      const boxW = maxBoxW * START_FRACTION;
      const boxH = maxBoxH * START_FRACTION;
      setBox({ x: (dW - boxW) / 2, y: (dH - boxH) / 2, w: boxW, h: boxH });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, aspect]);

  const getPoint = (e) => {
    const point = e.touches ? e.touches[0] : e;
    const rect = stageRef.current.getBoundingClientRect();
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const startMove = (e) => {
    e.stopPropagation();
    const p = getPoint(e);
    dragRef.current = { mode: 'move', startX: p.x, startY: p.y, origBox: { ...box } };
  };

  const startResize = (handle) => (e) => {
    e.stopPropagation();
    const p = getPoint(e);
    dragRef.current = { mode: 'resize', handle, startX: p.x, startY: p.y, origBox: { ...box } };
  };

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current || !stageRef.current) return;
    const p = getPoint(e);
    const { mode, origBox } = dragRef.current;

    if (mode === 'move') {
      let x = origBox.x + (p.x - dragRef.current.startX);
      let y = origBox.y + (p.y - dragRef.current.startY);
      x = Math.max(0, Math.min(displaySize.w - origBox.w, x));
      y = Math.max(0, Math.min(displaySize.h - origBox.h, y));
      setBox((b) => ({ ...b, x, y }));
      return;
    }

    // resize — aspect stays locked, opposite corner is the fixed anchor
    const { handle } = dragRef.current;
    const anchor = {
      x: ANCHOR_OF[handle].includes('l') ? origBox.x : origBox.x + origBox.w,
      y: ANCHOR_OF[handle].includes('t') ? origBox.y : origBox.y + origBox.h,
    };
    const dx = p.x - anchor.x;
    const dy = p.y - anchor.y;

    const maxWFromStage = dx < 0 ? anchor.x : displaySize.w - anchor.x;
    const maxHFromStage = dy < 0 ? anchor.y : displaySize.h - anchor.y;
    let w = Math.min(Math.abs(dx), maxWFromStage, maxHFromStage * aspect);
    w = Math.max(w, MIN_BOX);
    const h = w / aspect;

    const x = dx < 0 ? anchor.x - w : anchor.x;
    const y = dy < 0 ? anchor.y - h : anchor.y;
    setBox({ x, y, w, h });
  }, [displaySize, aspect]);

  const handlePointerUp = useCallback(() => { dragRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleConfirm = () => {
    if (!imgRef.current || !displaySize.w) return;
    setProcessing(true);

    const scale = displaySize.w / naturalSize.w;
    const cropX = box.x / scale;
    const cropY = box.y / scale;
    const cropW = box.w / scale;
    const cropH = box.h / scale;

    const outW = Math.min(1000, Math.round(cropW));
    const outH = Math.round(outW / aspect);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgRef.current, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

    canvas.toBlob((blob) => {
      setProcessing(false);
      if (!blob) return;
      const croppedFile = new File([blob], file.name.replace(/\.\w+$/, '') + '-cropped.jpg', {
        type: 'image/jpeg',
      });
      onConfirm(croppedFile);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
            Crop photo
          </p>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div
            ref={stageRef}
            className="relative mx-auto select-none touch-none"
            style={{ width: displaySize.w || MAX_DISPLAY_W, height: displaySize.h || MAX_DISPLAY_H }}
          >
            {imgUrl && (
              <img
                ref={imgRef}
                src={imgUrl}
                alt="Crop preview"
                draggable={false}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: displaySize.w, height: displaySize.h }}
              />
            )}

            {displaySize.w > 0 && (
              <div
                className="absolute cursor-move"
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.w,
                  height: box.h,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                  border: '1.5px solid white',
                }}
                onMouseDown={startMove}
                onTouchStart={startMove}
              >
                {/* rule-of-thirds guide lines */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/30" />
                  ))}
                </div>

                {HANDLES.map((h) => (
                  <div
                    key={h}
                    onMouseDown={startResize(h)}
                    onTouchStart={startResize(h)}
                    className="absolute w-4 h-4 bg-white rounded-full border-2 border-blue-600 shadow"
                    style={{
                      cursor: CURSOR_OF[h],
                      left: h.includes('l') ? -8 : undefined,
                      right: h.includes('r') ? -8 : undefined,
                      top: h.includes('t') ? -8 : undefined,
                      bottom: h.includes('b') ? -8 : undefined,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Drag the box to reposition, drag a corner to resize
          </p>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-xl text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="flex-1 h-10 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {processing ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Use photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}