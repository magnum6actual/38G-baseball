'use client';

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type BuilderState = 'interviewing' | 'headshot' | 'generating' | 'complete';

interface BuilderProfile {
  name?: string;
  rank?: string;
  unit?: string;
  clearance_level?: string;
  [key: string]: unknown;
}

export default function BuilderPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome! I'll help you create your 38G Baseball Card. You can start by uploading your resume or other documents, or we can begin the interview directly.\n\nWhat's your name and current rank?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<BuilderState>('interviewing');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [profile, setProfile] = useState<BuilderProfile>({});

  // Headshot state
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [processedHeadshot, setProcessedHeadshot] = useState<string | null>(null);
  const [headshotEnhancements, setHeadshotEnhancements] = useState('');
  const [isProcessingHeadshot, setIsProcessingHeadshot] = useState(false);

  // PDF state
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust textarea height based on content (up to 4 lines, then scroll)
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight, capped at max-height (handled by CSS)
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  // Reset textarea height when input is cleared (after sending)
  useEffect(() => {
    if (input === '') {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }, [input]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Resize image to fit within maxSize while maintaining aspect ratio
  // Returns base64 string (without data URL prefix)
  const resizeImage = (file: File, maxSize: number = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
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

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Get base64 (remove data URL prefix)
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        const base64 = dataUrl.split(',')[1];

        console.log(`Resized image: ${img.naturalWidth}x${img.naturalHeight} -> ${width}x${height}`);
        console.log(`Base64 size: ${Math.round(base64.length / 1024)} KB`);

        resolve(base64);
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Load image from file
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Documents are now auto-processed on upload, so we just send the message
      const response = await fetch('/api/chat/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Builder failed');
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantMessage = '';
      let newConversationId = conversationId;
      let newState = state;
      let newProfile = profile;

      // Add empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'conversationId') {
                newConversationId = data.conversationId;
                setConversationId(data.conversationId);
              } else if (data.type === 'text') {
                assistantMessage += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return updated;
                });
              } else if (data.type === 'state') {
                newState = data.state;
                setState(data.state);
                // Enable input as soon as we get state (text is done)
                setIsLoading(false);
              } else if (data.type === 'profile') {
                newProfile = data.profile;
                setProfile(data.profile);
              } else if (data.type === 'done') {
                // Final state update
                if (data.state) setState(data.state);
                if (data.profile) setProfile(data.profile);
                setIsLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Builder error:', error);
      setMessages((prev) => {
        // Remove empty assistant message if present
        const filtered = prev.filter(
          (m, i) => !(i === prev.length - 1 && m.role === 'assistant' && m.content === '')
        );
        return [
          ...filtered,
          {
            role: 'assistant',
            content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Track files currently being processed to avoid double-processing
  const processingFilesRef = useRef<Set<string>>(new Set());

  // Auto-process uploaded documents as a chat turn
  const processDocumentUpload = useCallback(async (files: File[]) => {
    // Filter out files already being processed
    const newFiles = files.filter(f => !processingFilesRef.current.has(f.name));
    if (newFiles.length === 0 || isLoading) return;

    // Mark these files as being processed
    newFiles.forEach(f => processingFilesRef.current.add(f.name));

    setIsLoading(true);

    try {
      // Prepare documents with filenames
      const documents: Array<{ filename: string; content: string }> = [];
      for (const file of newFiles) {
        const base64 = await fileToBase64(file);
        documents.push({ filename: file.name, content: base64 });
      }

      // Add a user message about the upload
      const fileNames = newFiles.map(f => f.name).join(', ');
      const userMessage = newFiles.length === 1
        ? `I've uploaded a document: ${fileNames}`
        : `I've uploaded ${newFiles.length} documents: ${fileNames}`;

      setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

      const response = await fetch('/api/chat/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
          documents,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Builder failed');
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Add empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'conversationId') {
                setConversationId(data.conversationId);
              } else if (data.type === 'text') {
                assistantMessage += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return updated;
                });
              } else if (data.type === 'state') {
                setState(data.state);
                // Enable input as soon as we get state (text is done)
                setIsLoading(false);
              } else if (data.type === 'profile') {
                setProfile(data.profile);
              } else if (data.type === 'done') {
                if (data.state) setState(data.state);
                if (data.profile) setProfile(data.profile);
                setIsLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Add to processed files list and clear from pending
      setProcessedFileNames((prev) => [...prev, ...newFiles.map(f => f.name)]);
      setUploadedFiles((prev) => prev.filter(f => !newFiles.includes(f)));
      // Clear from processing tracker
      newFiles.forEach(f => processingFilesRef.current.delete(f.name));
    } catch (error) {
      console.error('Document upload error:', error);
      // Clear from processing tracker on error
      newFiles.forEach(f => processingFilesRef.current.delete(f.name));
      // Also remove from uploadedFiles so user can retry
      setUploadedFiles((prev) => prev.filter(f => !newFiles.includes(f)));
      setMessages((prev) => {
        const filtered = prev.filter(
          (m, i) => !(i === prev.length - 1 && m.role === 'assistant' && m.content === '')
        );
        return [
          ...filtered,
          {
            role: 'assistant',
            content: `I encountered an error processing your document: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, fileToBase64]);

  // Process any pending files when loading completes
  useEffect(() => {
    if (!isLoading && uploadedFiles.length > 0) {
      // Find files not yet processed
      const pendingFiles = uploadedFiles.filter(f => !processingFilesRef.current.has(f.name));
      if (pendingFiles.length > 0) {
        processDocumentUpload(pendingFiles);
      }
    }
  }, [isLoading, uploadedFiles, processDocumentUpload]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setUploadedFiles((prev) => [...prev, ...fileArray]);
      // Auto-process the uploaded files
      processDocumentUpload(fileArray);
    }
  }, [processDocumentUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setUploadedFiles((prev) => [...prev, ...fileArray]);
      // Auto-process the dropped files
      processDocumentUpload(fileArray);
    }
  }, [processDocumentUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleHeadshotUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeadshotFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setHeadshotPreview(url);
      setProcessedHeadshot(null);
    }
  }, []);

  const handleHeadshotDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setHeadshotFile(file);
      const url = URL.createObjectURL(file);
      setHeadshotPreview(url);
      setProcessedHeadshot(null);
    }
  }, []);

  const processHeadshot = async () => {
    if (!headshotFile) return;

    setIsProcessingHeadshot(true);

    try {
      // Resize image to 512px max dimension to stay under API limits
      // This handles large iPhone photos (10+ MB) automatically
      const base64 = await resizeImage(headshotFile, 512);

      const response = await fetch('/api/headshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectImage: base64,
          enhancements: headshotEnhancements || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Headshot processing failed');
      }

      const data = await response.json();

      if (data.success && data.processedImage) {
        setProcessedHeadshot(`data:image/png;base64,${data.processedImage}`);
      } else {
        throw new Error(data.error || 'No processed image returned');
      }
    } catch (error) {
      console.error('Headshot processing error:', error);
      alert(`Failed to process headshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingHeadshot(false);
    }
  };

  const useOriginalHeadshot = () => {
    if (headshotPreview) {
      setProcessedHeadshot(headshotPreview);
    }
  };

  const generateCard = async () => {
    setState('generating');
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Generating your 38G Baseball Card... This may take a moment.' },
    ]);

    try {
      // Get headshot base64 if we have a processed one
      let headshotBase64: string | undefined;
      if (processedHeadshot) {
        // Remove data URL prefix if present
        headshotBase64 = processedHeadshot.includes(',')
          ? processedHeadshot.split(',')[1]
          : processedHeadshot;
      }

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          headshotBase64,
          saveToDatabase: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'PDF generation failed');
      }

      const data = await response.json();

      if (data.success) {
        setState('complete');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Your 38G Baseball Card has been generated! You can download it using the button in the sidebar. Your profile is now searchable in the talent database.',
          },
        ]);

        // Create a data URL for the PDF download
        if (data.pdfBase64) {
          setGeneratedPdfUrl(`data:application/pdf;base64,${data.pdfBase64}`);
        } else if (data.pdfUrl) {
          setGeneratedPdfUrl(data.pdfUrl);
        }
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      setState('headshot'); // Go back to headshot state
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Failed to generate your card: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        },
      ]);
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case 'interviewing':
        return 'Interview';
      case 'headshot':
        return 'Headshot';
      case 'generating':
        return 'Generating';
      case 'complete':
        return 'Complete';
    }
  };

  const resetBuilder = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Welcome! I'll help you create your 38G Baseball Card. You can start by uploading your resume or other documents, or we can begin the interview directly.\n\nWhat's your name and current rank?",
      },
    ]);
    setUploadedFiles([]);
    setProcessedFileNames([]);
    setState('interviewing');
    setConversationId(null);
    setProfile({});
    setHeadshotFile(null);
    setHeadshotPreview(null);
    setProcessedHeadshot(null);
    setHeadshotEnhancements('');
    setGeneratedPdfUrl(null);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden">
      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold">Card Builder</h2>
            <p className="text-sm text-muted-foreground">
              Create your 38G Baseball Card
            </p>
          </div>
          <Badge variant="outline">{getStateLabel()}</Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="text-sm prose prose-sm prose-neutral dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t flex-shrink-0">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                // Submit on Enter (without Shift)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !isLoading && state !== 'generating' && state !== 'complete') {
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }
              }}
              placeholder="Type your response... (Enter to send, Shift+Enter for new line)"
              disabled={isLoading || state === 'generating' || state === 'complete'}
              className="flex-1 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
              rows={1}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || state === 'generating' || state === 'complete'}
              className="h-10"
            >
              Send
            </Button>
          </div>
        </form>
      </div>

      {/* Side Panel */}
      <div className="w-80 flex-shrink-0 flex flex-col border-l bg-muted/30 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Documents Section */}
          <div className={`p-4 border-b ${state !== 'interviewing' ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                state === 'interviewing'
                  ? 'bg-[#FFD700] text-black'
                  : 'bg-green-500 text-white'
              }`}>
                {state === 'interviewing' ? '1' : '✓'}
              </span>
              <h3 className="font-semibold text-sm">Documents</h3>
            </div>

            {state === 'interviewing' ? (
              <>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".txt,.md,.pdf,.doc,.docx"
                  />
                  <p className="text-sm text-muted-foreground">
                    Drop files here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Resume, certifications, etc.
                  </p>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">Processing...</p>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="text-xs bg-yellow-500/20 rounded px-2 py-1 truncate flex items-center justify-between"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
                          }}
                          className="text-muted-foreground hover:text-foreground ml-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {processedFileNames.length > 0 && (
              <div className={state === 'interviewing' ? 'mt-2 space-y-1' : 'space-y-1'}>
                {state !== 'interviewing' && <p className="text-xs text-muted-foreground mb-1">Uploaded:</p>}
                {processedFileNames.map((name, index) => (
                  <div
                    key={index}
                    className="text-xs bg-green-500/20 rounded px-2 py-1 truncate flex items-center gap-1"
                  >
                    <span className="text-green-600">✓</span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Headshot Section */}
          <div className={`p-4 border-b ${
            state === 'headshot'
              ? 'bg-[#FFD700]/10 border-l-4 border-l-[#FFD700]'
              : state === 'interviewing'
                ? 'opacity-50'
                : ''
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                state === 'headshot'
                  ? 'bg-[#FFD700] text-black'
                  : state === 'interviewing'
                    ? 'bg-muted-foreground/30 text-muted-foreground'
                    : 'bg-green-500 text-white'
              }`}>
                {(state === 'generating' || state === 'complete') ? '✓' : '2'}
              </span>
              <h3 className="font-semibold text-sm">Headshot</h3>
              {state === 'headshot' && <Badge variant="outline" className="text-xs">Active</Badge>}
            </div>

            {state === 'interviewing' ? (
              <p className="text-xs text-muted-foreground">
                Complete the interview to upload your photo
              </p>
            ) : !headshotFile ? (
              <div
                className="border-2 border-dashed border-[#FFD700]/50 rounded-lg p-4 text-center cursor-pointer hover:bg-[#FFD700]/10 transition-colors"
                onDrop={handleHeadshotDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('headshot-upload')?.click()}
              >
                <input
                  id="headshot-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeadshotUpload}
                />
                <p className="text-sm text-muted-foreground">
                  Upload your photo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  In uniform preferred
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Preview */}
                <div className="relative aspect-[2/3] bg-muted rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={processedHeadshot || headshotPreview || ''}
                    alt="Headshot preview"
                    className="w-full h-full object-cover"
                  />
                  {processedHeadshot && (
                    <Badge className="absolute top-2 right-2 bg-green-600">
                      Processed
                    </Badge>
                  )}
                </div>

                {/* Enhancement input */}
                {!processedHeadshot && (
                  <Textarea
                    placeholder="Optional: Enhancement requests (e.g., reduce shadows, soften wrinkles)"
                    className="text-sm"
                    rows={2}
                    value={headshotEnhancements}
                    onChange={(e) => setHeadshotEnhancements(e.target.value)}
                  />
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!processedHeadshot ? (
                    <>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={processHeadshot}
                        disabled={isProcessingHeadshot}
                      >
                        {isProcessingHeadshot ? 'Processing...' : 'Process Photo'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={useOriginalHeadshot}
                      >
                        Use Original
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={generateCard}
                        disabled={state === 'generating' || state === 'complete'}
                      >
                        Generate Card
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setProcessedHeadshot(null)}
                      >
                        Re-process
                      </Button>
                    </>
                  )}
                </div>

                {/* Change photo */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setHeadshotFile(null);
                    setHeadshotPreview(null);
                    setProcessedHeadshot(null);
                  }}
                >
                  Change Photo
                </Button>
              </div>
            )}
          </div>

          {/* Profile Summary */}
          {Object.keys(profile).length > 0 && (
            <div className="p-4 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Profile Data</h4>
              <div className="text-xs space-y-1">
                {profile.name && <p><span className="text-muted-foreground">Name:</span> {String(profile.name)}</p>}
                {profile.rank && <p><span className="text-muted-foreground">Rank:</span> {String(profile.rank)}</p>}
                {profile.unit && <p><span className="text-muted-foreground">Unit:</span> {String(profile.unit)}</p>}
                {profile.clearance_level && <p><span className="text-muted-foreground">Clearance:</span> {String(profile.clearance_level)}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Completion Actions - stays at bottom */}
        {state === 'complete' && (
          <div className="p-4 border-t space-y-2 flex-shrink-0">
            {generatedPdfUrl && (
              <Button className="w-full" asChild>
                <a href={generatedPdfUrl} download="38G_Baseball_Card.pdf">
                  Download PDF
                </a>
              </Button>
            )}
            <Button className="w-full" variant="outline" onClick={resetBuilder}>
              Start New Card
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
