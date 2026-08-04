'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import ImageCropModal from './ImageCropModal';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Placeholder when no image — shows emoji + gradient based on item name
function ImagePlaceholder({ name = '', size = 'md' }) {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-amber-500 to-amber-600',
    'from-emerald-500 to-emerald-600',
    'from-rose-500 to-rose-600',
    'from-teal-500 to-teal-600',
  ];
  const foodEmojis = ['🍛', '🍜', '🍱', '🥗', '🍔', '🥘', '🍝', '🍲', '🥙', '🧆'];

  // Pick consistently based on name string
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = colors[index % colors.length];
  const emoji = foodEmojis[index % foodEmojis.length];

  const sizeClass = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-full h-36 text-4xl',
  }[size];

  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
      <span>{emoji}</span>
    </div>
  );
}

export { ImagePlaceholder };

// aspect: width / height for the crop stage. 1 = square (avatars), 16/9-ish
// for banners — pass e.g. aspect={2.5} for the wide banner in VendorSettings.
export default function ImageUpload({ value, onChange, label = 'Photo', optional = true, size = 'lg', aspect = 1 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState(null); // file waiting to be cropped
  const inputRef = useRef();

  const uploadFile = async (file) => {
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'instrict');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();

      if (data.secure_url) {
        onChange(data.secure_url);
      } else {
        setError('Upload failed. Please try again.');
      }
    } catch (err) {
      setError('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    setError('');
    // Don't upload yet — let the user crop/resize first
    setPendingFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleCropConfirm = (croppedFile) => {
    setPendingFile(null);
    uploadFile(croppedFile);
  };

  const handleCropCancel = () => {
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {label} {optional && <span className="normal-case font-medium">(optional)</span>}
        </label>
      )}

      {value ? (
        // Preview
        <div className="relative group">
          <img
            src={value}
            alt="Upload preview"
            className="w-full h-36 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 h-7 px-2.5 bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all opacity-0 group-hover:opacity-100"
          >
            <Upload className="w-3 h-3" /> Change
          </button>
        </div>
      ) : (
        // Drop zone
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`w-full h-36 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
            uploading
              ? 'border-blue-300 dark:border-blue-700 bg-blue-500/5 cursor-not-allowed'
              : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-500/5'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-[11px] font-bold text-blue-500">Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Click or drag to upload
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] font-bold text-rose-500">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />

      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          aspect={aspect}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}