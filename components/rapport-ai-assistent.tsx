'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SourceBadge } from '@/components/source-badge';
import type { OnderzoekDocument } from '@/lib/research/types';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import {
  bewerkRapportMetAiAction,
  vraagRapportAssistentAction,
} from '@/lib/actions/rapport-assistent';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: 'live' | 'demo';
}

interface RapportAiAssistentProps {
  traceId: string;
  rapport: OnderzoekDocument | null;
  conflicten: DetectedConflict[];
  onRapportBewerkt: (inhoud: string) => void;
}

const SUGGESTIES = [
  'Maak de conclusie korter en duidelijker',
  'Voeg mitigerende maatregelen toe',
  'Vat sectie 4 samen in 3 bullets',
];

export function RapportAiAssistent({
  traceId,
  rapport,
  conflicten,
  onRapportBewerkt,
}: RapportAiAssistentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ik help bij het aanpassen van onderzoeksrapporten. Geef een instructie — bijvoorbeeld “maak conclusie korter” of “voeg maatregelen toe”.',
      source: 'demo',
    },
  ]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: rapport
          ? `Rapport "${rapport.titel}" is actief. Wat wilt u aanpassen?`
          : 'Start eerst een onderzoek links. Daarna kunt u hier wijzigingen doorgeven.',
        source: 'demo',
      },
    ]);
    setInput('');
  }, [rapport?.type]);

  function appendMessage(role: ChatMessage['role'], text: string, source?: 'live' | 'demo') {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, role, text, source },
    ]);
  }

  function handleSubmit(instructie = input) {
    const trimmed = instructie.trim();
    if (!trimmed || isPending) return;

    appendMessage('user', trimmed);
    setInput('');

    if (!rapport) {
      appendMessage('assistant', 'Selecteer eerst een rapport via de stappen links of start een onderzoek.');
      return;
    }

    startTransition(async () => {
      const bewerk =
        /pas aan|wijzig|voeg toe|maak|korter|beknopt|update|herformuleer|vervang/i.test(trimmed);

      try {
        if (bewerk) {
          const result = await bewerkRapportMetAiAction(
            traceId,
            rapport.type,
            rapport.inhoud,
            trimmed,
            conflicten
          );
          onRapportBewerkt(result.inhoud);
          appendMessage('assistant', result.antwoord, result._source);
        } else {
          const result = await vraagRapportAssistentAction(
            traceId,
            trimmed,
            rapport.titel,
            rapport.inhoud,
            conflicten
          );
          appendMessage('assistant', result.antwoord, result._source);
        }
      } catch {
        appendMessage(
          'assistant',
          'Er ging iets mis. Probeer het opnieuw of formuleer de instructie anders.'
        );
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2D6FE8]/10">
          <Bot className="h-4 w-4 text-[#2D6FE8]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">AI-assistent</p>
          <p className="text-[10px] text-muted-foreground">Rapport aanpassen &amp; vragen stellen</p>
        </div>
        {messages.some((m) => m.source === 'live') && <SourceBadge source="live" />}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg px-2.5 py-2 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? 'ml-4 bg-[#2D6FE8] text-white'
                : 'mr-2 bg-muted text-foreground'
            }`}
          >
            {msg.role === 'assistant' && msg.source === 'live' && (
              <span className="mb-1 block text-[9px] uppercase tracking-wide text-muted-foreground">
                OpenAI
              </span>
            )}
            {msg.text}
          </div>
        ))}
        {isPending && (
          <div className="mr-2 flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Bezig…
          </div>
        )}
      </div>

      {rapport && (
        <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
          {SUGGESTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSubmit(s)}
              disabled={isPending}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:border-[#2D6FE8]/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            rapport
              ? 'Bijv. “Voeg een conclusie toe over uitvoerbaarheid”'
              : 'Start eerst een onderzoek…'
          }
          disabled={isPending || !rapport}
          rows={2}
          className="mb-2 min-h-[56px] resize-none text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="sm"
          className="w-full bg-[#2D6FE8] hover:bg-[#2D6FE8]/90"
          disabled={isPending || !rapport || !input.trim()}
          onClick={() => handleSubmit()}
        >
          {isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Send className="mr-1 h-3 w-3" />
          )}
          Verstuur
        </Button>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Instructies met “pas aan” / “voeg toe” wijzigen het rapport direct.
        </p>
      </div>
    </div>
  );
}
