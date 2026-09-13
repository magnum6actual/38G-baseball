'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../Platform';
import { conversationSearch } from '../lib/conversationSearch';
import { officerDetail } from '../lib/profile';
import { downloadCard, printCard } from '../lib/cardHtml';
type Message = {role:'user'|'assistant';content:string};
type OfficerDetail = ReturnType<typeof officerDetail>;
type OfficerResult = OfficerDetail;

export default function SearchPage() {
  const platform = usePlatform();
  const navigate = useNavigate();
  const request = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => request.current?.abort(), []);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to 38G Talent Search. I can help you find Military Government Specialists for your mission. Describe the skills, experience, languages, or qualifications you're looking for, and I'll search our talent database.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [primaryTeam, setPrimaryTeam] = useState<OfficerResult[]>([]);
  const [alsoMentioned, setAlsoMentioned] = useState<OfficerResult[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerDetail | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'results'>('chat');
  const [resultsFlash, setResultsFlash] = useState(false);
  const prevResultsCount = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming content updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Flash the Results tab when new results arrive (3 red blinks)
  const totalResults = primaryTeam.length + alsoMentioned.length;
  useEffect(() => {
    if (totalResults > prevResultsCount.current && mobileTab === 'chat') {
      setResultsFlash(true);
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setResultsFlash(prev => !prev);
        if (count >= 6) {
          clearInterval(interval);
          setResultsFlash(false);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
    prevResultsCount.current = totalResults;
  }, [totalResults, mobileTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setStreamingContent('');

    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setConversationId(previous => previous || crypto.randomUUID());
    try {
      if (platform.loading) throw new Error('The officer roster is still loading. Please retry shortly.');
      if (platform.error) throw new Error(`Unable to load the officer roster: ${platform.error}`);
      const result = await conversationSearch(platform.model, platform.officers, [...messages, {role:'user',content:userMessage}], setStreamingContent, controller.signal);
      if (controller.signal.aborted) return;
      setPrimaryTeam(result.primaryTeam);
      setAlsoMentioned(result.alsoMentioned);
      setMessages(prev => [...prev, {role:'assistant',content:result.prose}]);
    } catch (error) {
      if (!controller.signal.aborted) setMessages(prev => [...prev,{role:'assistant',content:`I encountered an error: ${error instanceof Error ? error.message : 'Search failed'}. Please try again.`}]);
    } finally {
      if (!controller.signal.aborted) {setStreamingContent('');setIsLoading(false);}
    }
  };

  const handleOfficerClick = (officerId:string) => {
    try {
      const officer=platform.officers.find(o=>o.id===officerId);
      if (!officer) throw new Error('This officer is no longer available. Search again to refresh your results.');
      setSelectedOfficer(officerDetail(officer)); setIsDialogOpen(true);
    } catch(error) {setMessages(prev=>[...prev,{role:'assistant',content:error instanceof Error?error.message:'Unable to open this profile.'}]);}
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
    request.current?.abort();
    setIsLoading(false); setStreamingContent(''); setInput('');setMobileTab('chat');prevResultsCount.current=0;
    setMessages([
      {
        role: 'assistant',
        content: "Welcome to 38G Talent Search. I can help you find Military Government Specialists for your mission. Describe the skills, experience, languages, or qualifications you're looking for, and I'll search our talent database.",
      },
    ]);
    setPrimaryTeam([]);
    setAlsoMentioned([]);
    setConversationId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
      {/* Mobile Tab Bar */}
      {(primaryTeam.length > 0 || alsoMentioned.length > 0) && (
        <div className="flex md:hidden border-b flex-shrink-0">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${
              mobileTab === 'chat'
                ? 'border-b-2 border-[#FFD700] text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => { setMobileTab('results'); setResultsFlash(false); prevResultsCount.current = totalResults; }}
            className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${
              mobileTab === 'results'
                ? 'border-b-2 border-[#FFD700] text-foreground'
                : resultsFlash
                  ? 'bg-red-600 text-white'
                  : 'text-muted-foreground'
            }`}
          >
            Results ({primaryTeam.length + alsoMentioned.length})
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
      {/* Chat Panel - Left Side (full width on mobile) */}
      <div className={`flex-1 flex flex-col md:border-r min-w-0 overflow-hidden ${mobileTab !== 'chat' ? 'hidden md:flex' : ''}`}>
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto p-4">
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
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="text-sm prose prose-sm prose-neutral dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3 max-w-[80%]">
                  {streamingContent ? (
                    <div className="text-sm prose prose-sm prose-neutral dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="animate-pulse">Searching the talent database...</span>
                    </p>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t flex-shrink-0">
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
      <div className={`w-full md:w-96 flex-shrink-0 flex flex-col bg-muted/30 overflow-hidden ${
        primaryTeam.length === 0 && alsoMentioned.length === 0
          ? 'hidden md:flex'
          : mobileTab !== 'results' ? 'hidden md:flex' : ''
      }`}>
        <div className="p-4 border-b bg-muted/50 flex-shrink-0">
          <h2 className="font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">
            {primaryTeam.length > 0
              ? `${primaryTeam.length} recommended${alsoMentioned.length > 0 ? `, ${alsoMentioned.length} also referenced` : ''}`
              : alsoMentioned.length > 0 ? `${alsoMentioned.length} also referenced` : 'Matching candidates will appear here'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {primaryTeam.length === 0 && alsoMentioned.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No search results yet</p>
              <p className="text-xs mt-1">
                Start by describing the specialist you need
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Primary Team */}
              {primaryTeam.map((officer) => (
                <Card
                  key={officer.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleOfficerClick(officer.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={officer.photoUrl || undefined} alt={`${officer.rank} ${officer.name}`} className="object-cover object-top" />
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

              {/* Divider and Also Mentioned */}
              {alsoMentioned.length > 0 && (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">Also Referenced</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {alsoMentioned.map((officer) => (
                    <Card
                      key={officer.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors opacity-75"
                      onClick={() => handleOfficerClick(officer.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={officer.photoUrl || undefined} alt={`${officer.rank} ${officer.name}`} className="object-cover object-top" />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {getInitials(officer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {officer.rank}
                              </Badge>
                              <span className="font-medium text-sm truncate">
                                {officer.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {officer.unit}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      </div>

      {/* Officer Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedOfficer && (
            <>
              <DialogHeader>
                <div className="flex gap-4">
                  {/* Officer Photo */}
                  {selectedOfficer.hasPhoto && selectedOfficer.photoUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={selectedOfficer.photoUrl}
                        alt={selectedOfficer.name}
                        className="w-24 h-32 object-cover rounded-md border"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-2">
                      <Badge>{selectedOfficer.rank}</Badge>
                      {selectedOfficer.name}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">{selectedOfficer.unit}</p>
                    <p className="text-sm mt-1">{selectedOfficer.civilian_occupation}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">MOS/Skill:</span>
                    <p className="font-medium">{selectedOfficer.mos_skill}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Clearance:</span>
                    <p className="font-medium">{selectedOfficer.clearance_level}</p>
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
                  <Button onClick={() => downloadCard(selectedOfficer.profile)}>Download HTML</Button>
                  <Button variant="outline" onClick={() => printCard(selectedOfficer.profile)}>Print Card</Button>
                  {selectedOfficer.ownerUserId === platform.identity.id && <Button variant="outline" onClick={() => navigate(`/builder?officer=${encodeURIComponent(selectedOfficer.id)}`)}>Edit My Card</Button>}
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
