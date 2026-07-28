'use client';

import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Loader2, Star } from 'lucide-react';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'instrict');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Upload failed');
  return data.secure_url;
}

export default function MultiImageUpload({ value = [], onChange, label = 'Product Photos', max = 6 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;

    const room = max - value.length;
    if (room <= 0) {
      setError(`You can only add up to ${max} photos.`);
      return;
    }
    const toUpload = files.slice(0, room);
    if (toUpload.some(f => f.size > 5 * 1024 * 1024)) {
      setError('Each image must be under 5MB');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(uploadToCloudinary));
      onChange([...value, ...urls]);
    } catch {
      setError('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i) => onChange(value.filter((_, idx) => idx !== i));

  const makeCover = (i) => {
    if (i === 0) return;
    const next = [...value];
    const [chosen] = next.splice(i, 1);
    next.unshift(chosen);
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label} <span className="normal-case font-medium">({value.length}/{max})</span>
      </label>

      <div className="grid grid-cols-3 gap-2">
        {value.map((url, i) => (
          <div key={url + i} className="relative group aspect-square">
            <img src={url} alt="" className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
            {i === 0 && (
              <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">
                Cover
              </span>
            )}
            <button type="button" onClick={() => removeAt(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <X className="w-3 h-3" />
            </button>
            {i !== 0 && (
              <button type="button" onClick={() => makeCover(i)} title="Set as cover photo"
                className="absolute bottom-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <Star className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {value.length < max && (
          <div
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
            onClick={() => !uploading && inputRef.current?.click()}
            className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
              uploading
                ? 'border-blue-300 dark:border-blue-700 bg-blue-500/5 cursor-not-allowed'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-500/5'
            }`}
          >
            {uploading ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : (
              <>
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-400">Add</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}