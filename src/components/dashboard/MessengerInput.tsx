'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Image as ImageIcon, Sticker, Smile, SendHorizontal, StopCircle } from 'lucide-react';

export type ChatMedia = {
  type: 'image' | 'audio';
  data: string; // base64
  mimeType: string;
};

interface MessengerInputProps {
  onSend: (text: string, mediaUrl?: string, mediaType?: 'image' | 'audio') => void;
  disabled?: boolean;
  placeholder?: string;
  isTakeover?: boolean;
  shopId: string;
  replyingTo?: { id: string; text: string; mid?: string } | null;
  onCancelReply?: () => void;
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
}

export default function MessengerInput({ 
  onSend, 
  disabled, 
  placeholder = 'Aa', 
  isTakeover, 
  shopId, 
  replyingTo, 
  onCancelReply,
  inputValue,
  onInputValueChange
}: MessengerInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputValue !== undefined) {
      setText(inputValue);
    }
  }, [inputValue]);

  useEffect(() => {
    if (replyingTo) {
      // Focus the input box when a reply is initiated
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      onInputValueChange?.('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Image Upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shopId', shopId);

      const res = await fetch('/api/inventory/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      if (data.url) {
        onSend('', data.url, 'image');
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image.');
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // In a real implementation, you would upload this blob to Supabase storage
          // and get a public URL like we do with images. For now, we alert it's unsupported.
          alert("Audio uploads not yet supported.");
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSticker = () => {
    alert("Stickers coming soon!");
  };

  const handleEmoji = () => {
    const val = text + '😀';
    setText(val);
    onInputValueChange?.(val);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const placeholderText = isTakeover ? 'Type a reply as human...' : placeholder;

  return (
    <div className="flex flex-col w-full bg-white border-t border-[#E5E5E5]">
      {replyingTo && (() => {
        const isImage = replyingTo.text.startsWith('IMAGE:') || /!\[.*?\]\((.*?)\)/.test(replyingTo.text);
        const imageUrl = replyingTo.text.startsWith('IMAGE:') 
          ? replyingTo.text.substring(6) 
          : replyingTo.text.match(/!\[.*?\]\((.*?)\)/)?.[1];

        return (
          <div className="flex items-center justify-between px-4 py-2 bg-[#F0F2F5]/50 border-b border-[#E5E5E5]">
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-[12px] font-semibold text-[#050505]">Replying to</span>
              {isImage ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-6 w-6 rounded bg-black/10 overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={imageUrl} alt="Replying to image" className="h-full w-full object-cover" />
                  </div>
                  <span className="text-[13px] text-[#65676B] italic">Photo</span>
                </div>
              ) : (
                <span className="text-[13px] text-[#65676B] truncate">{replyingTo.text}</span>
              )}
            </div>
            <button 
              type="button" 
              onClick={onCancelReply}
              className="p-1 rounded-full text-[#65676B] hover:bg-black/5 transition-colors shrink-0"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        );
      })()}
      <div className="flex items-center gap-2.5 w-full max-w-full px-3 py-2">
      {/* Left Icons */}
      {!isRecording && (
        <div className="flex items-center gap-1 shrink-0 text-[#0084FF]">
          <button 
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            <Mic className="w-[22px] h-[22px]" strokeWidth={2.5} />
          </button>
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            <ImageIcon className="w-[22px] h-[22px]" strokeWidth={2.5} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleImageSelect}
          />

          <button 
            type="button"
            onClick={handleSticker}
            disabled={disabled}
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            <Sticker className="w-[22px] h-[22px]" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Center Input Area */}
      <div className="flex-1 relative flex items-center">
        {isRecording ? (
          <div className="w-full bg-[#F0F2F5] dark:bg-[#21262d] h-[36px] rounded-full flex items-center justify-between px-4 border border-transparent dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-ink">{formatTime(recordingTime)}</span>
            </div>
            <button 
              type="button"
              onClick={stopRecording}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors cursor-pointer"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onInputValueChange?.(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholderText}
              className="w-full bg-[#F0F2F5] dark:bg-[#21262d] rounded-full pl-4 pr-10 h-[36px] text-[15px] text-[#050505] dark:text-[#f0f6fc] placeholder:text-[#65676B] dark:placeholder:text-[#8b949e] border border-transparent dark:border-white/10 focus:outline-none"
            />
            <button 
              type="button"
              onClick={handleEmoji}
              disabled={disabled}
              className="absolute right-2 p-1 text-[#0084FF] rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Smile className="w-[22px] h-[22px]" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      {/* Right Send Icon */}
      {!isRecording && (
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className={`shrink-0 p-1.5 rounded-full transition-colors ${
            text.trim() && !disabled ? 'text-[#0084FF] hover:bg-black/5' : 'text-[#BEC3C9]'
          }`}
        >
          <SendHorizontal className="w-[24px] h-[24px]" strokeWidth={2.5} />
        </button>
      )}
      </div>
    </div>
  );
}
