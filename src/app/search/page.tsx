'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OfficerResult {
  id: string;
  name: string;
  rank: string;
  unit: string;
  summary: string;
  photoUrl: string | null;
}

interface OfficerDetail {
  id: string;
  name: string;
  rank: string;
  unit: string;
  clearance_level: string;
  mos_skill: string;
  skills: string;
  experience: string;
  deployments: string;
  languages: string;
  education: string;
  civilian_occupation: string;
  credentials: string;
  awards: string;
  additional_info: string;
  detail_data: string | null;
  summary: string | null;
  hasPdf: boolean;
  hasPhoto: boolean;
  pdfUrl: string | null;
  photoUrl: string | null;
}

export default function SearchPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to 38G Talent Search. I can help you find Military Government Specialists for your mission. Describe the skills, experience, languages, or qualifications you're looking for, and I'll search our talent database.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [officers, setOfficers] = useState<OfficerResult[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerDetail | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }

      const data = await response.json();

      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);

      // Update officers list
      if (data.officers && data.officers.length > 0) {
        setOfficers(data.officers);
      }
    } catch (error) {
      console.error('Search error:', error);
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

  const handleOfficerClick = async (officerId: string) => {
    try {
      const response = await fetch(`/api/officers/${officerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch officer details');
      }
      const data: OfficerDetail = await response.json();
      setSelectedOfficer(data);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching officer:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNewSearch = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Welcome to 38G Talent Search. I can help you find Military Government Specialists for your mission. Describe the skills, experience, languages, or qualifications you're looking for, and I'll search our talent database.",
      },
    ]);
    setOfficers([]);
    setConversationId(null);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Chat Panel - Left Side */}
      <div className="flex-1 flex flex-col border-r">
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Talent Search</h2>
            <p className="text-sm text-muted-foreground">
              Describe the specialist you need
            </p>
          </div>
          {conversationId && (
            <Button variant="outline" size="sm" onClick={handleNewSearch}>
              New Search
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
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
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="animate-pulse">Searching the talent database...</span>
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Find someone with threat finance experience who speaks Arabic..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* Results Panel - Right Side */}
      <div className="w-96 flex flex-col bg-muted/30">
        <div className="p-4 border-b bg-muted/50">
          <h2 className="font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">
            {officers.length > 0
              ? `${officers.length} candidates found`
              : 'Matching candidates will appear here'}
          </p>
        </div>

        <ScrollArea className="flex-1 p-4">
          {officers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No search results yet</p>
              <p className="text-xs mt-1">
                Start by describing the specialist you need
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {officers.map((officer) => (
                <Card
                  key={officer.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleOfficerClick(officer.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={officer.photoUrl || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(officer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {officer.rank}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {officer.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {officer.unit}
                        </p>
                        <p className="text-xs mt-1 line-clamp-2">
                          {officer.summary}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Officer Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedOfficer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge>{selectedOfficer.rank}</Badge>
                  {selectedOfficer.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Unit:</span>
                    <p className="font-medium">{selectedOfficer.unit}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Clearance:</span>
                    <p className="font-medium">{selectedOfficer.clearance_level}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MOS/Skill:</span>
                    <p className="font-medium">{selectedOfficer.mos_skill}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Civilian Job:</span>
                    <p className="font-medium">{selectedOfficer.civilian_occupation}</p>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <span className="text-sm text-muted-foreground">Skills:</span>
                  <p className="text-sm">{selectedOfficer.skills}</p>
                </div>

                {/* Languages */}
                <div>
                  <span className="text-sm text-muted-foreground">Languages:</span>
                  <p className="text-sm">{selectedOfficer.languages}</p>
                </div>

                {/* Education */}
                <div>
                  <span className="text-sm text-muted-foreground">Education:</span>
                  <p className="text-sm">{selectedOfficer.education}</p>
                </div>

                {/* Additional Info */}
                <div>
                  <span className="text-sm text-muted-foreground">Additional Info:</span>
                  <p className="text-sm whitespace-pre-wrap">{selectedOfficer.additional_info}</p>
                </div>

                {/* Deployments */}
                {selectedOfficer.deployments && (
                  <div>
                    <span className="text-sm text-muted-foreground">Deployments:</span>
                    <p className="text-sm whitespace-pre-wrap">{selectedOfficer.deployments}</p>
                  </div>
                )}

                {/* Experience */}
                {selectedOfficer.experience && (
                  <div>
                    <span className="text-sm text-muted-foreground">Experience:</span>
                    <p className="text-sm whitespace-pre-wrap">{selectedOfficer.experience}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedOfficer.hasPdf && (
                    <Button asChild>
                      <a href={selectedOfficer.pdfUrl!} download>
                        Download PDF
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
