'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Loader2, Zap, BookOpen, Copy, Check,
  RotateCcw, Trash2, ChevronDown, Sparkles, Brain,
  MessageSquare, Clock, Plus, X, PanelLeftClose, PanelLeftOpen,
  ThumbsUp, ThumbsDown, Download, Hash,
} from 'lucide-react';
import { sendChatMessage } from '../../lib/api';

/* ─── Types ────────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
  liked?: boolean | null;  // true = up, false = down, null = neutral
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  messageCount: number;
  preview: string;
}

/* ─── Helpers ──────────────────────────────────────────────────── */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function estimateTokens(text: string) {
  return Math.ceil(text.split(/\s+/).length * 1.35);
}

const SYSTEM_GREETING =
  "Hello! I'm your **KnowledgeOS AI** assistant, powered by RAG-search over your enterprise knowledge base.\n\nI can:\n- Answer questions from your uploaded documents\n- Summarise policies, runbooks, and guides\n- Find knowledge gaps in your content\n- Cross-reference multiple documents\n\nTry a suggested question below, or type your own!";

const STARTER_PROMPTS = [
  { icon: '📋', label: 'Onboarding procedures', text: 'What are our HR onboarding procedures?' },
  { icon: '📊', label: 'Q3 strategy summary', text: 'Summarise the Q3 Strategy document' },
  { icon: '💳', label: 'Refund policy', text: 'What is our refund and returns policy?' },
  { icon: '🛠️', label: 'Engineering runbooks', text: 'List all engineering runbooks' },
  { icon: '🔒', label: 'Security standards', text: 'What are our data security standards?' },
  { icon: '🚀', label: 'Deployment process', text: 'Explain the deployment process step by step' },
];

/* ─── Markdown-lite renderer ───────────────────────────────────── */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="chat-code-block"><code class="chat-code${lang ? ` lang-${lang}` : ''}">${code.trim()}</code></pre>`
    )
    // inline code
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    // bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // headings
    .replace(/^### (.+)$/gm, '<h4 class="chat-md-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="chat-md-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="chat-md-h2">$1</h2>')
    // unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul class="chat-md-ul">${m}</ul>`)
    // ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // horizontal rules
    .replace(/^---$/gm, '<hr class="chat-md-hr"/>')
    // line breaks → paragraphs
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('<')) return block;
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}

/* ─── Sub-components ───────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className="chat-action-btn" onClick={copy} title="Copy message" id={`copy-${uid()}`}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function MessageBubble({
  msg,
  onRegenerate,
  onLike,
  isLast,
}: {
  msg: Message;
  onRegenerate?: () => void;
  onLike?: (id: string, val: boolean | null) => void;
  isLast?: boolean;
}) {
  const isAI = msg.role === 'assistant';

  return (
    <div className={`chat-message ${msg.role}`} id={`msg-${msg.id}`}>
      {/* Avatar */}
      <div className={`chat-avatar ${msg.role}`}>
        {isAI ? <Zap size={15} /> : <User size={15} />}
      </div>

      {/* Bubble + metadata */}
      <div className="chat-bubble-group">
        <div className={`chat-bubble ${msg.role}`}>
          {isAI ? (
            <div
              className="chat-md"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />
          ) : (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{msg.content}</p>
          )}
        </div>

        {/* Action row */}
        <div className={`chat-meta ${msg.role}`}>
          <span className="chat-timestamp">
            <Clock size={10} />
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.tokens && (
            <span className="chat-tokens">
              <Hash size={10} /> {msg.tokens} tokens
            </span>
          )}

          <div className="chat-actions">
            <CopyButton text={msg.content} />
            {isAI && onLike && (
              <>
                <button
                  className={`chat-action-btn${msg.liked === true ? ' active-like' : ''}`}
                  onClick={() => onLike(msg.id, msg.liked === true ? null : true)}
                  title="Helpful"
                >
                  <ThumbsUp size={13} />
                </button>
                <button
                  className={`chat-action-btn${msg.liked === false ? ' active-dislike' : ''}`}
                  onClick={() => onLike(msg.id, msg.liked === false ? null : false)}
                  title="Not helpful"
                >
                  <ThumbsDown size={13} />
                </button>
              </>
            )}
            {isAI && isLast && onRegenerate && (
              <button className="chat-action-btn" onClick={onRegenerate} title="Regenerate">
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */
export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => uid());
  const [messagesBySession, setMessagesBySession] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [totalTokens, setTotalTokens] = useState(0);

  /* computed */
  const messages = messagesBySession[activeSessionId] ?? [];
  const hasUserMessages = messages.some((m) => m.role === 'user');

  /* auto-scroll */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  /* focus input */
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

  /* token total */
  useEffect(() => {
    const total = messages.reduce((s, m) => s + (m.tokens ?? 0), 0);
    setTotalTokens(total);
  }, [messages]);

  /* auto-resize textarea */
  const resizeTextarea = () => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  /* session helpers */
  const createSession = () => {
    const id = uid();
    setActiveSessionId(id);
    setInput('');
  };

  const updateSessionMeta = useCallback((sessionId: string, msgs: Message[]) => {
    const userMsgs = msgs.filter((m) => m.role === 'user');
    if (!userMsgs.length) return;
    const title = userMsgs[0].content.slice(0, 40) + (userMsgs[0].content.length > 40 ? '…' : '');
    const preview = msgs[msgs.length - 1]?.content.slice(0, 60) ?? '';
    setSessions((prev) => {
      const exists = prev.find((s) => s.id === sessionId);
      if (exists) {
        return prev.map((s) =>
          s.id === sessionId
            ? { ...s, title, preview, messageCount: userMsgs.length }
            : s
        );
      }
      return [
        { id: sessionId, title, preview, createdAt: new Date(), messageCount: userMsgs.length },
        ...prev,
      ];
    });
  }, []);

  /* send message */
  const handleSend = async (queryOverride?: string) => {
    const text = (queryOverride ?? input).trim();
    if (!text || loading) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      tokens: estimateTokens(text),
    };

    const updatedMsgs = [...messages, userMsg];
    setMessagesBySession((prev) => ({ ...prev, [activeSessionId]: updatedMsgs }));
    setLoading(true);

    try {
      const res = await sendChatMessage(text, activeSessionId);
      const aiContent = res.response || 'No response received.';
      const aiMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
        tokens: estimateTokens(aiContent),
        liked: null,
      };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessagesBySession((prev) => ({ ...prev, [activeSessionId]: finalMsgs }));
      updateSessionMeta(activeSessionId, finalMsgs);
    } catch (err: any) {
      const errMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: `⚠️ **Connection Error**\n\nCould not reach the backend API.\n\nMake sure the backend is running at \`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}\`.\n\n**Error:** ${err.message}`,
        timestamp: new Date(),
        tokens: 0,
        liked: null,
      };
      const finalMsgs = [...updatedMsgs, errMsg];
      setMessagesBySession((prev) => ({ ...prev, [activeSessionId]: finalMsgs }));
      updateSessionMeta(activeSessionId, finalMsgs);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  /* regenerate last AI response */
  const handleRegenerate = async () => {
    if (loading) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    // remove last assistant message
    const trimmed = messages.slice(0, messages.lastIndexOf(messages.filter((m) => m.role === 'assistant').at(-1)!));
    setMessagesBySession((prev) => ({ ...prev, [activeSessionId]: trimmed }));
    await handleSend(lastUser.content);
  };

  /* like / dislike */
  const handleLike = (id: string, val: boolean | null) => {
    setMessagesBySession((prev) => ({
      ...prev,
      [activeSessionId]: (prev[activeSessionId] ?? []).map((m) =>
        m.id === id ? { ...m, liked: val } : m
      ),
    }));
  };

  /* clear current chat */
  const clearChat = () => {
    setMessagesBySession((prev) => ({ ...prev, [activeSessionId]: [] }));
    setSessions((prev) => prev.filter((s) => s.id !== activeSessionId));
  };

  /* delete session */
  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setMessagesBySession((prev) => { const c = { ...prev }; delete c[id]; return c; });
    if (id === activeSessionId) createSession();
  };

  /* export chat */
  const exportChat = () => {
    const text = messages
      .map((m) => `[${m.role.toUpperCase()} - ${m.timestamp.toLocaleTimeString()}]\n${m.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chat-${activeSessionId.slice(0, 8)}.txt`;
    a.click();
  };

  /* key handler */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ────────────── RENDER ────────────── */
  return (
    <div className="ai-chat-layout">

      {/* ── Session Sidebar ── */}
      <aside className={`ai-chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="ai-chat-sidebar-header">
          <div className="ai-chat-sidebar-title">
            <MessageSquare size={15} />
            Conversations
          </div>
          <button className="chat-icon-btn" onClick={() => setSidebarOpen(false)} title="Collapse">
            <PanelLeftClose size={16} />
          </button>
        </div>

        <button className="ai-new-chat-btn" onClick={createSession} id="new-chat-btn">
          <Plus size={16} /> New Chat
        </button>

        <div className="ai-session-list">
          {sessions.length === 0 && (
            <div className="ai-session-empty">
              <Bot size={28} style={{ opacity: 0.3 }} />
              <p>No history yet</p>
            </div>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`ai-session-item ${s.id === activeSessionId ? 'active' : ''}`}
              onClick={() => setActiveSessionId(s.id)}
              id={`session-${s.id}`}
            >
              <div className="ai-session-icon"><MessageSquare size={13} /></div>
              <div className="ai-session-info">
                <span className="ai-session-title">{s.title}</span>
                <span className="ai-session-preview">{s.preview}</span>
              </div>
              <button
                className="ai-session-del"
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                title="Delete"
              >
                <X size={12} />
              </button>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <div className="ai-chat-main">

        {/* Top Bar */}
        <div className="ai-chat-topbar">
          <div className="ai-chat-topbar-left">
            {!sidebarOpen && (
              <button className="chat-icon-btn" onClick={() => setSidebarOpen(true)} id="open-sidebar-btn">
                <PanelLeftOpen size={16} />
              </button>
            )}
            <div className="ai-chat-topbar-title">
              <Zap size={18} style={{ color: 'var(--color-primary-light)' }} />
              <span>AI Knowledge Chat</span>
            </div>
          </div>

          <div className="ai-chat-topbar-right">
            {/* model pill */}
            <div className="ai-model-pill">
              <Brain size={13} />
              <span>Claude 3 · RAG</span>
              <ChevronDown size={12} />
            </div>

            {/* token counter */}
            {totalTokens > 0 && (
              <div className="ai-token-counter">
                <Hash size={12} />
                {totalTokens.toLocaleString()} tokens
              </div>
            )}

            {hasUserMessages && (
              <>
                <button className="chat-icon-btn" onClick={exportChat} title="Export chat" id="export-chat-btn">
                  <Download size={16} />
                </button>
                <button className="chat-icon-btn danger" onClick={clearChat} title="Clear chat" id="clear-chat-btn">
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="ai-messages-area" ref={scrollRef}>

          {/* Welcome state */}
          {!hasUserMessages && (
            <div className="ai-welcome">
              <div className="ai-welcome-icon">
                <Sparkles size={32} />
              </div>
              <h2 className="ai-welcome-title">KnowledgeOS AI</h2>
              <p className="ai-welcome-sub">
                Ask me anything about your enterprise knowledge base.
              </p>

              {/* System greeting */}
              <div className="ai-welcome-greeting">
                <div className="chat-avatar assistant" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  <Zap size={15} />
                </div>
                <div
                  className="chat-bubble assistant"
                  style={{ maxWidth: 560 }}
                >
                  <div
                    className="chat-md"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(SYSTEM_GREETING) }}
                  />
                </div>
              </div>

              {/* Starter prompts */}
              <div className="ai-starter-grid">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    className="ai-starter-card"
                    onClick={() => handleSend(p.text)}
                    id={`starter-${p.label.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <span className="ai-starter-icon">{p.icon}</span>
                    <span className="ai-starter-label">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.filter((m) => !(m.role === 'assistant' && !hasUserMessages)).map((msg, i) => {
            const isLastAI =
              msg.role === 'assistant' &&
              i === messages.length - 1 &&
              !loading;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onRegenerate={isLastAI ? handleRegenerate : undefined}
                onLike={handleLike}
                isLast={isLastAI}
              />
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="chat-message assistant">
              <div className="chat-avatar assistant"><Zap size={15} /></div>
              <div className="chat-bubble-group">
                <div className="chat-bubble assistant">
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                </div>
                <div className="chat-meta assistant">
                  <span className="chat-timestamp" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Loader2 size={10} className="spinner" /> Thinking…
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="ai-input-area">
          {/* Suggested quick prompts (compact, after first message) */}
          {hasUserMessages && messages.length < 4 && (
            <div className="ai-quick-prompts">
              {STARTER_PROMPTS.slice(0, 3).map((p) => (
                <button
                  key={p.text}
                  className="ai-quick-chip"
                  onClick={() => handleSend(p.text)}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          )}

          <div className="ai-input-box">
            <textarea
              ref={inputRef}
              className="ai-textarea"
              placeholder="Ask anything about your knowledge base… (Shift+Enter for new line)"
              value={input}
              onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              id="chat-message-input"
              aria-label="Chat input"
            />
            <div className="ai-input-actions">
              <span className="ai-char-count">{input.length > 0 ? `${input.length} chars` : ''}</span>
              <button
                className="ai-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                id="chat-send-btn"
              >
                {loading ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
              </button>
            </div>
          </div>

          <div className="ai-input-footer">
            <span>
              <BookOpen size={11} /> Powered by RAG · Claude 3 · KnowledgeOS
            </span>
            <span>Enter to send · Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
