
import React, { useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImageUploadProps {
    bucketName: string;
    folderPath: string;
    onUploadComplete: (url: string) => void;
    currentImageUrl?: string | null;
    label?: string;
}

function compressImageToBlob(file: File, maxWidth = 1600, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((maxWidth / width) * height);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob failed'));
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

export function ImageUpload({ bucketName, folderPath, onUploadComplete, currentImageUrl, label = "Upload Image" }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setError(null);
            const file = event.target.files?.[0];
            if (!file) return;

            setUploading(true);

            // Compress image client-side to reduce storage egress & upload time
            const compressedBlob = await compressImageToBlob(file);

            // Sanitize filename and path
            const sanitize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-0\/\._-]/g, '_');
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
            const filePath = sanitize(`${folderPath}/${fileName}`);

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, compressedBlob, {
                    contentType: 'image/jpeg',
                    cacheControl: '31536000'
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            onUploadComplete(publicUrl);
        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        onUploadComplete(""); // Clear the URL
    }

    return (
        <div className="flex flex-col gap-2">
            {label && <label className="text-sm font-medium text-gray-700">{label}</label>}

            <div className="flex items-center gap-4">
                {currentImageUrl ? (
                    <div className="relative group">
                        <img
                            src={currentImageUrl}
                            alt="Uploaded"
                            className="h-20 w-20 object-cover rounded-md border border-gray-200"
                        />
                        <button
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ) : (
                    <div className="h-20 w-20 bg-gray-100 rounded-md flex items-center justify-center border border-dashed border-gray-300">
                        <ImageIcon className="text-gray-400" size={24} />
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <label className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                ${uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}
            `}>
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {uploading ? 'Uploading...' : 'Select Image'}
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </label>
                    {error && <span className="text-xs text-red-500">{error}</span>}
                </div>
            </div>
        </div>
    );
}
