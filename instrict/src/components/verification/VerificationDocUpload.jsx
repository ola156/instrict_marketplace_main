'use client';

import { useState, useRef } from 'react';
import { X, FileImage, Loader2, Check } from 'lucide-react';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'instrict/verifications');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Upload failed');
  return data.secure_url;
}

export default function VerificationDocUpload({ label, hint, value, onChange, required = true }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFile = async (fileList) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch {
      setError('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {hint && <p className="text-[10px] text-slate-400 -mt-1">{hint}</p>}

      {value ? (
        <div className="relative group aspect-[4/3] max-w-xs">
          <img src={value} alt="" className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
          <div className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> Uploaded
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`aspect-[4/3] max-w-xs rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
            uploading
              ? 'border-blue-300 dark:border-blue-700 bg-blue-500/5 cursor-not-allowed'
              : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-500/5'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <>
              <FileImage className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400">Tap to upload</span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}