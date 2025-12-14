import React, { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
  transcribeService: (base64: string, mimeType: string) => Promise<string>;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscription, onLoadingChange, transcribeService }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
        stream.getTracks().forEach(track => track.stop()); // Stop mic
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    onLoadingChange(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Remove header "data:audio/webm;base64,"
        const base64Content = base64String.split(',')[1];
        const mimeType = base64String.split(';')[0].split(':')[1];
        
        try {
            const text = await transcribeService(base64Content, mimeType);
            onTranscription(text);
        } catch (e) {
            console.error("API error", e);
            alert("Failed to transcribe audio.");
        } finally {
            onLoadingChange(false);
        }
      };
    } catch (e) {
        console.error(e);
        onLoadingChange(false);
    }
  };

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-2 rounded-lg transition-all ${
        isRecording 
          ? 'bg-red-500/20 text-red-500 animate-pulse ring-1 ring-red-500/50' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
      title={isRecording ? "Stop Recording" : "Record Voice Note"}
    >
      {isRecording ? <Square size={18} /> : <Mic size={18} />}
    </button>
  );
};

export default VoiceInput;