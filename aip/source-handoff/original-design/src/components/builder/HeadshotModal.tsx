'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface HeadshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (processedImage: string) => void;
  currentHeadshot: string | null;
}

export function HeadshotModal({
  isOpen,
  onClose,
  onComplete,
  currentHeadshot,
}: HeadshotModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modifications, setModifications] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize image to fit within maxSize while maintaining aspect ratio
  const resizeImage = useCallback((file: File, maxSize: number = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProcessedImage(null);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setPreview(result.split(',')[1]); // Store base64 without prefix
      };
      reader.readAsDataURL(selectedFile);
    }
    e.target.value = '';
  }, []);

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await resizeImage(file, 512);

      const response = await fetch('/api/headshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectImage: base64,
          enhancements: modifications.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Headshot processing failed');
      }

      const data = await response.json();

      if (data.success && data.processedImage) {
        setProcessedImage(data.processedImage);
      } else {
        throw new Error(data.error || 'No processed image returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseOriginal = () => {
    if (preview) {
      setProcessedImage(preview);
    }
  };

  const handleComplete = () => {
    if (processedImage) {
      onComplete(processedImage);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setProcessedImage(null);
    setError(null);
    setModifications('');
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a1a] text-[#FFD700] px-4 py-3 font-semibold">
          Upload Photo
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Single image display */}
          <div className="mb-4">
            <div
              className={`w-full max-w-[280px] mx-auto aspect-[3/4] bg-gray-100 border-2 rounded flex items-center justify-center ${
                !processedImage && !isProcessing ? 'border-dashed border-gray-300 cursor-pointer hover:border-[#FFD700]' : 'border-gray-200'
              } transition-colors`}
              onClick={() => !processedImage && !isProcessing && fileInputRef.current?.click()}
            >
              {isProcessing ? (
                <div className="text-center text-gray-500">
                  <div className="animate-spin w-10 h-10 border-3 border-[#FFD700] border-t-transparent rounded-full mx-auto mb-3"></div>
                  <div className="text-sm">Processing photo...</div>
                </div>
              ) : processedImage ? (
                <img
                  src={`data:image/png;base64,${processedImage}`}
                  alt="Processed headshot"
                  className="w-full h-full object-cover rounded"
                />
              ) : preview ? (
                <img
                  src={`data:image/png;base64,${preview}`}
                  alt="Your photo"
                  className="w-full h-full object-cover rounded"
                />
              ) : currentHeadshot ? (
                <img
                  src={`data:image/png;base64,${currentHeadshot}`}
                  alt="Current photo"
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="text-center text-gray-400 p-4">
                  <div className="text-4xl mb-2">+</div>
                  <div className="text-sm">Click to select photo</div>
                </div>
              )}
            </div>
            {processedImage && (
              <p className="text-center text-xs text-gray-500 mt-2">Processed headshot ready</p>
            )}
          </div>

          {/* Modification suggestions */}
          {file && !processedImage && !isProcessing && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Modification suggestions (optional)
              </label>
              <textarea
                value={modifications}
                onChange={(e) => setModifications(e.target.value)}
                placeholder="e.g., make me look a little younger, brighten the lighting, remove glasses..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]"
                rows={2}
              />
              <p className="text-xs text-gray-400 mt-1">
                Your face will remain accurate. These suggestions apply to lighting, background, etc.
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            {file && !processedImage && !isProcessing && (
              <>
                <Button onClick={handleProcess} className="bg-[#1a1a1a] hover:bg-[#333]">
                  Process Photo
                </Button>
                <Button variant="outline" onClick={handleUseOriginal}>
                  Skip Processing
                </Button>
                <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
                  Change Photo
                </Button>
              </>
            )}

            {processedImage && (
              <>
                <Button onClick={handleComplete} className="bg-[#1a1a1a] hover:bg-[#333]">
                  Use This Photo
                </Button>
                <Button variant="outline" onClick={() => setProcessedImage(null)}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={handleReset}>
                  Different Photo
                </Button>
              </>
            )}

            {!file && !currentHeadshot && (
              <Button onClick={() => fileInputRef.current?.click()} className="bg-[#1a1a1a] hover:bg-[#333]">
                Select Photo
              </Button>
            )}

            {!file && currentHeadshot && (
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                Change Photo
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex justify-end">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
