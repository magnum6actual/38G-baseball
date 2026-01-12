'use client';

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BaseballCard } from '@/components/builder/BaseballCard';
import { BuilderProfile } from '@/lib/builder';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type BuilderState = 'interviewing' | 'headshot' | 'generating' | 'complete';

export default function BuilderPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome! I'll help you create your 38G Baseball Card. You can start by uploading your resume or other documents using the attachment button, or we can begin the interview directly.\n\nWhat's your name and current rank?",
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
  const [isProcessingHeadshot, setIsProcessingHeadshot] = useState(false);

  // PDF state
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);

  // Adjust textarea height based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  // Reset textarea height when input is cleared
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

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  }, []);

  // Resize image to fit within maxSize while maintaining aspect ratio
  const resizeImage = (file: File, maxSize: number = 512): Promise<string> => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
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

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantMessage = '';

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
              } else if (data.type === 'text_complete') {
                setIsLoading(false);
              } else if (data.type === 'state') {
                setState(data.state);
              } else if (data.type === 'profile') {
                setProfile(data.profile);
              } else if (data.type === 'done') {
                if (data.state) setState(data.state);
                if (data.profile) setProfile(data.profile);
                setIsLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Builder error:', error);
      setMessages((prev) => {
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

  // Track files currently being processed
  const processingFilesRef = useRef<Set<string>>(new Set());

  // Auto-process uploaded documents as a chat turn
  const processDocumentUpload = useCallback(async (files: File[]) => {
    const newFiles = files.filter(f => !processingFilesRef.current.has(f.name));
    if (newFiles.length === 0) return;

    newFiles.forEach(f => processingFilesRef.current.add(f.name));
    setIsLoading(true);

    try {
      const documents: Array<{ filename: string; content: string }> = [];
      for (const file of newFiles) {
        const base64 = await fileToBase64(file);
        documents.push({ filename: file.name, content: base64 });
      }

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

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantMessage = '';

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
              } else if (data.type === 'text_complete') {
                setIsLoading(false);
              } else if (data.type === 'state') {
                setState(data.state);
              } else if (data.type === 'profile') {
                setProfile(data.profile);
              } else if (data.type === 'done') {
                if (data.state) setState(data.state);
                if (data.profile) setProfile(data.profile);
                setIsLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }

      setProcessedFileNames((prev) => [...prev, ...newFiles.map(f => f.name)]);
      setUploadedFiles((prev) => prev.filter(f => !newFiles.includes(f)));
      newFiles.forEach(f => processingFilesRef.current.delete(f.name));
    } catch (error) {
      console.error('Document upload error:', error);
      newFiles.forEach(f => processingFilesRef.current.delete(f.name));
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
  }, [conversationId, fileToBase64]);

  // Process pending files when loading completes
  useEffect(() => {
    if (!isLoading && uploadedFiles.length > 0) {
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
    }
    // Reset input so same file can be uploaded again
    e.target.value = '';
  }, []);

  const handleHeadshotUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeadshotFile(file);
      const url = URL.createObjectURL(file);
      setHeadshotPreview(url);
      setProcessedHeadshot(null);
    }
    e.target.value = '';
  }, []);

  const handleHeadshotClick = useCallback(() => {
    headshotInputRef.current?.click();
  }, []);

  const processHeadshot = async () => {
    if (!headshotFile) return;

    setIsProcessingHeadshot(true);

    try {
      const base64 = await resizeImage(headshotFile, 512);

      const response = await fetch('/api/headshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectImage: base64,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Headshot processing failed');
      }

      const data = await response.json();

      if (data.success && data.processedImage) {
        setProcessedHeadshot(data.processedImage);
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

  // Profile update handler for BaseballCard
  const handleProfileUpdate = useCallback((field: keyof BuilderProfile, value: unknown) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  }, []);

  const generateCard = async () => {
    setState('generating');
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Generating your 38G Baseball Card... This may take a moment.' },
    ]);

    try {
      let headshotBase64: string | undefined;
      if (processedHeadshot) {
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
            content: 'Your 38G Baseball Card has been generated! You can download it using the button below. Your profile is now searchable in the talent database.',
          },
        ]);

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
      setState('headshot');
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
        content: "Welcome! I'll help you create your 38G Baseball Card. You can start by uploading your resume or other documents using the attachment button, or we can begin the interview directly.\n\nWhat's your name and current rank?",
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
    setGeneratedPdfUrl(null);
  };

  // Get headshot for card display (base64 without data URL prefix)
  const cardHeadshot = processedHeadshot || (headshotPreview ? null : null);
  // If we have a preview URL but not processed, we need to convert it
  const displayHeadshot = processedHeadshot || null;

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
        accept=".txt,.md,.pdf,.doc,.docx"
      />
      <input
        ref={headshotInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleHeadshotUpload}
      />

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-[400px] overflow-hidden">
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold">Card Builder</h2>
            <p className="text-sm text-muted-foreground">
              Create your 38G Baseball Card
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getStateLabel()}</Badge>
            {processedFileNames.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {processedFileNames.length} doc{processedFileNames.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
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

        {/* Input with attachment button */}
        <form onSubmit={handleSubmit} className="p-4 border-t flex-shrink-0">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            {/* Attachment button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || state === 'generating' || state === 'complete'}
              title="Attach document"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
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
          {/* Upload indicator */}
          {uploadedFiles.length > 0 && (
            <div className="max-w-3xl mx-auto mt-2 flex gap-2 flex-wrap">
              {uploadedFiles.map((file, index) => (
                <span key={index} className="text-xs bg-yellow-500/20 rounded px-2 py-1 flex items-center gap-1">
                  <span className="animate-pulse">Processing:</span> {file.name}
                </span>
              ))}
            </div>
          )}
        </form>

        {/* Action buttons for headshot/generation */}
        {(state === 'headshot' || state === 'complete') && (
          <div className="p-4 border-t bg-muted/30 flex-shrink-0">
            <div className="max-w-3xl mx-auto flex gap-2 flex-wrap">
              {state === 'headshot' && !headshotFile && (
                <Button onClick={handleHeadshotClick} variant="outline">
                  Upload Photo
                </Button>
              )}
              {state === 'headshot' && headshotFile && !processedHeadshot && (
                <>
                  <Button onClick={processHeadshot} disabled={isProcessingHeadshot}>
                    {isProcessingHeadshot ? 'Processing...' : 'Process Photo'}
                  </Button>
                  <Button variant="outline" onClick={() => setProcessedHeadshot(headshotPreview)}>
                    Use Original
                  </Button>
                  <Button variant="ghost" onClick={handleHeadshotClick}>
                    Change Photo
                  </Button>
                </>
              )}
              {state === 'headshot' && processedHeadshot && (
                <>
                  <Button onClick={generateCard}>
                    Generate Card
                  </Button>
                  <Button variant="outline" onClick={() => setProcessedHeadshot(null)}>
                    Re-process Photo
                  </Button>
                </>
              )}
              {state === 'complete' && (
                <>
                  {generatedPdfUrl && (
                    <Button asChild>
                      <a href={generatedPdfUrl} download="38G_Baseball_Card.pdf">
                        Download PDF
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" onClick={resetBuilder}>
                    Start New Card
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Panel */}
      <div className="w-[700px] flex-shrink-0 flex flex-col border-l bg-muted/20 overflow-hidden">
        <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Card Preview</h3>
          <span className="text-xs text-muted-foreground">Click any field to edit</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <BaseballCard
            profile={profile}
            headshotPreview={displayHeadshot}
            onProfileUpdate={handleProfileUpdate}
            onHeadshotClick={handleHeadshotClick}
          />
        </div>
      </div>
    </div>
  );
}
