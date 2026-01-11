'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      // Prepare documents if any were recently uploaded
      const documents: string[] = [];
      for (const file of uploadedFiles) {
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          const base64 = await fileToBase64(file);
          documents.push(base64);
        }
      }

      const response = await fetch('/api/chat/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
          documents: documents.length > 0 ? documents : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Builder failed');
      }

      const data = await response.json();

      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);

      // Update state if changed
      if (data.state && data.state !== state) {
        setState(data.state);
      }

      // Update profile
      if (data.profile) {
        setProfile(data.profile);
      }

      // Clear uploaded files after they've been processed
      if (documents.length > 0) {
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error('Builder error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  }, []);

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
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Card Builder</h2>
            <p className="text-sm text-muted-foreground">
              Create your 38G Baseball Card
            </p>
          </div>
          <Badge variant="outline">{getStateLabel()}</Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
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
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response..."
              disabled={isLoading || state === 'generating' || state === 'complete'}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || state === 'generating' || state === 'complete'}
            >
              Send
            </Button>
          </div>
        </form>
      </div>

      {/* Side Panel */}
      <div className="w-80 flex flex-col border-l bg-muted/30">
        {/* Document Upload Section */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm mb-2">Documents</h3>
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
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="text-xs bg-muted rounded px-2 py-1 truncate flex items-center justify-between"
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
        </div>

        <Separator />

        {/* Headshot Section - Show in headshot state */}
        {(state === 'headshot' || state === 'generating' || state === 'complete') && (
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm mb-2">Headshot</h3>

            {!headshotFile ? (
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
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
        )}

        {/* Progress/Status Section */}
        <div className="p-4 flex-1">
          <h3 className="font-semibold text-sm mb-2">Progress</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  state === 'interviewing' ? 'bg-[#FFD700] animate-pulse' : 'bg-green-500'
                }`}
              />
              <span className="text-sm">Interview</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  state === 'headshot'
                    ? 'bg-[#FFD700] animate-pulse'
                    : state === 'generating' || state === 'complete'
                    ? 'bg-green-500'
                    : 'bg-muted-foreground/30'
                }`}
              />
              <span className="text-sm">Headshot</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  state === 'generating'
                    ? 'bg-[#FFD700] animate-pulse'
                    : state === 'complete'
                    ? 'bg-green-500'
                    : 'bg-muted-foreground/30'
                }`}
              />
              <span className="text-sm">Generate Card</span>
            </div>
          </div>

          {/* Profile Summary */}
          {Object.keys(profile).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Profile Data</h4>
              <div className="text-xs space-y-1">
                {profile.name && <p><span className="text-muted-foreground">Name:</span> {profile.name}</p>}
                {profile.rank && <p><span className="text-muted-foreground">Rank:</span> {profile.rank}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Completion Actions */}
        {state === 'complete' && (
          <div className="p-4 border-t space-y-2">
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
