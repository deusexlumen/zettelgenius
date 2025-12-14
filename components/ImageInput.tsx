import React, { useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageInputProps {
  onAnalysis: (text: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
  analyzeService: (base64: string, mimeType: string) => Promise<string>;
}

const ImageInput: React.FC<ImageInputProps> = ({ onAnalysis, onLoadingChange, analyzeService }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onLoadingChange(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1];
      const mimeType = file.type;

      try {
        const text = await analyzeService(base64Content, mimeType);
        onAnalysis(text);
      } catch (e) {
        console.error(e);
        alert("Failed to analyze image.");
      } finally {
        onLoadingChange(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        title="Analyze Image"
      >
        <ImageIcon size={18} />
      </button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
    </>
  );
};

export default ImageInput;