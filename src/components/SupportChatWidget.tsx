import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  initSupportConversation,
  getSupportConversation,
  sendSupportVisitorMessage,
  pollSupportMessages,
  reopenSupportConversation,
  getMySupportTickets,
  API_BASE_URL
} from '../services/api';
import { playNotificationSound } from '../utils/audioNotification';
import type { SupportConversation, SupportMessage, SupportConversationListItem } from '../types';

const STORAGE_KEY_SESSION = 'tradecall_support_session_id';
const STORAGE_KEY_SESSIONS_LIST = 'tradecall_support_session_ids';
const STORAGE_KEY_GUEST = 'tradecall_support_guest_info';
const STORAGE_KEY_DISMISS_TOOLTIP = 'tradecall_support_tooltip_dismissed';

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

function saveSessionToList(sessionId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS_LIST);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(sessionId)) {
      list.unshift(sessionId);
      localStorage.setItem(STORAGE_KEY_SESSIONS_LIST, JSON.stringify(list.slice(0, 30)));
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredSessions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function toListItem(conv: SupportConversation): SupportConversationListItem {
  const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
  return {
    id: conv.id,
    session_id: conv.session_id,
    user_id: conv.user_id,
    display_name: conv.display_name,
    display_email: conv.display_email,
    display_phone: conv.display_phone,
    is_registered_user: conv.is_registered_user,
    status: conv.status,
    unread_admin_count: conv.unread_admin_count,
    unread_user_count: conv.unread_user_count,
    last_message_text: lastMsg ? lastMsg.message : 'Conversation started',
    last_message_at: conv.last_message_at,
    created_at: conv.created_at
  };
}

export default function SupportChatWidget() {
  const { user } = useAuth();

  // Widget visibility states
  const [isOpen, setIsOpen] = useState(false);
  const [showChoiceMenu, setShowChoiceMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState(() => {
    return !localStorage.getItem(STORAGE_KEY_DISMISS_TOOLTIP);
  });

  // View state: 'chat' or 'tickets'
  const [widgetView, setWidgetView] = useState<'chat' | 'tickets'>('chat');
  const [ticketsList, setTicketsList] = useState<SupportConversationListItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  // Chat conversation state
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [guestForm, setGuestForm] = useState<GuestInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GUEST);
      return saved ? JSON.parse(saved) : { name: '', email: '', phone: '' };
    } catch {
      return { name: '', email: '', phone: '' };
    }
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mobile viewport detection (<= 640px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background body scrolling when mobile chat or choice menu is open
  useEffect(() => {
    if (isMobile && (isOpen || showChoiceMenu)) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isMobile, isOpen, showChoiceMenu]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const retryDelayRef = useRef<number>(1000);
  const isReconnectingRef = useRef<boolean>(false);
  const messagesRef = useRef<SupportMessage[]>(messages);
  messagesRef.current = messages;
  const conversationRef = useRef<SupportConversation | null>(conversation);
  conversationRef.current = conversation;
  const isOpenRef = useRef<boolean>(isOpen);
  isOpenRef.current = isOpen;

  const upsertTicketItem = useCallback((item: SupportConversationListItem) => {
    setTicketsList(prev => {
      const rest = prev.filter(t => t.id !== item.id && t.session_id !== item.session_id);
      const next = [item, ...rest];
      next.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      return next;
    });
    window.dispatchEvent(new CustomEvent('support_ticket_updated', { detail: item }));
  }, []);

  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, adminTyping, scrollToBottom]);

  // Load existing session on mount if present
  useEffect(() => {
    const savedSessionId = localStorage.getItem(STORAGE_KEY_SESSION);
    if (savedSessionId) {
      saveSessionToList(savedSessionId);
      getSupportConversation(savedSessionId)
        .then(res => {
          if (res.data?.data) {
            const conv = res.data.data;
            setConversation(conv);
            setMessages(conv.messages || []);
            setUnreadCount(conv.unread_user_count || 0);
            upsertTicketItem(toListItem(conv));
          }
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY_SESSION);
        });
    }
  }, [upsertTicketItem]);

  // Sync if signed in user changes
  useEffect(() => {
    if (user && !conversation) {
      const savedSessionId = localStorage.getItem(STORAGE_KEY_SESSION);
      if (savedSessionId) {
        getSupportConversation(savedSessionId).then(res => {
          if (res.data?.data) {
            const conv = res.data.data;
            setConversation(conv);
            setMessages(conv.messages || []);
            upsertTicketItem(toListItem(conv));
          }
        }).catch(() => {
          localStorage.removeItem(STORAGE_KEY_SESSION);
        });
      }
    }
  }, [user, conversation, upsertTicketItem]);

  // Listen for custom event from elsewhere (e.g. Account page "Open Support Chat")
  useEffect(() => {
    const handleOpenTicketEvent = (e: Event) => {
      const custom = e as CustomEvent<{ sessionId?: string }>;
      setIsOpen(true);
      setShowChoiceMenu(false);
      if (custom.detail?.sessionId) {
        void handleSelectTicket(custom.detail.sessionId);
      }
    };
    window.addEventListener('open_support_chat', handleOpenTicketEvent);
    return () => window.removeEventListener('open_support_chat', handleOpenTicketEvent);
  }, []);

  // On reconnect, fetch missed messages once using /poll?after_id=<last message id>, then stop.
  const fetchMissedMessages = useCallback(async (sessionId: string) => {
    try {
      const currentMsgs = messagesRef.current;
      const validMsgs = currentMsgs.filter(m => m.id > 0);
      const lastId = validMsgs.length > 0 ? Math.max(...validMsgs.map(m => m.id)) : 0;
      if (lastId === 0) return;

      const res = await pollSupportMessages(sessionId, lastId);
      if (res.data?.data && res.data.data.length > 0) {
        const fresh = res.data.data;
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const toAdd = fresh.filter(m => !existingIds.has(m.id));
          if (toAdd.length === 0) return prev;
          return [...prev, ...toAdd];
        });
      }
    } catch {
      // Missed messages fetch silently failed
    }
  }, []);

  // Persistent WebSocket Connection (stays connected whenever a session exists, even when widget is minimized)
  useEffect(() => {
    const activeSessionId = conversation?.session_id || getStoredSessions()[0];
    if (!activeSessionId) {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        window.clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    const connectWebSocket = () => {
      if (isCancelled) return;

      let wsUrl: string;
      if (API_BASE_URL.startsWith('http')) {
        wsUrl = API_BASE_URL.replace(/^http/, 'ws') + `/api/v1/support/ws/${activeSessionId}`;
      } else {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProto}//${window.location.host}/api/v1/support/ws/${activeSessionId}`;
      }

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;
          retryDelayRef.current = 1000;

          const allSessions = Array.from(new Set([activeSessionId, ...getStoredSessions()]));
          ws.send(JSON.stringify({ type: 'subscribe', session_ids: allSessions }));

          if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25000);

          if (isReconnectingRef.current) {
            void fetchMissedMessages(activeSessionId);
            isReconnectingRef.current = false;
          }
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);

            if (payload.conversation) {
              upsertTicketItem(payload.conversation);
            }

            if (payload.type === 'new_conversation' && payload.data) {
              const newConv: SupportConversation = payload.data;
              if (!conversationRef.current || conversationRef.current.session_id === newConv.session_id) {
                setConversation(newConv);
                setMessages(newConv.messages || []);
              }
            } else if (payload.type === 'new_message' && payload.data) {
              const newMsg: SupportMessage & { temp_id?: number; session_id?: string } = payload.data;
              const isForCurrentConv =
                conversationRef.current &&
                (newMsg.conversation_id === conversationRef.current.id ||
                  newMsg.session_id === conversationRef.current.session_id);

              if (newMsg.sender_type === 'admin') {
                setAdminTyping(false);
                playNotificationSound();
              }

              if (isForCurrentConv) {
                setMessages(prev => {
                  if (prev.some(m => m.id === newMsg.id)) return prev;

                  const optIndex = prev.findIndex(
                    m => (newMsg.temp_id && m.id === newMsg.temp_id) || (m.id < 0 && m.message === newMsg.message)
                  );
                  if (optIndex !== -1) {
                    const updated = [...prev];
                    updated[optIndex] = newMsg;
                    return updated;
                  }

                  return [...prev, newMsg];
                });

                if (payload.conversation?.status) {
                  setConversation(prev => (prev ? { ...prev, status: payload.conversation.status } : prev));
                }

                if (!isOpenRef.current && newMsg.sender_type === 'admin') {
                  setUnreadCount(c => c + 1);
                } else if (isOpenRef.current && newMsg.sender_type === 'admin' && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'mark_read', session_id: activeSessionId }));
                }
              } else if (newMsg.sender_type === 'admin' && !isOpenRef.current) {
                setUnreadCount(c => c + 1);
              }
            } else if (payload.type === 'status_changed' && payload.status) {
              if (
                conversationRef.current &&
                (!payload.session_id || payload.session_id === conversationRef.current.session_id)
              ) {
                setConversation(prev => (prev ? { ...prev, status: payload.status } : prev));
              }
            } else if (payload.type === 'conversation_deleted' && payload.session_id) {
              setTicketsList(prev => prev.filter(t => t.session_id !== payload.session_id));
              if (conversationRef.current?.session_id === payload.session_id) {
                localStorage.removeItem(STORAGE_KEY_SESSION);
                setConversation(null);
                setMessages([]);
              }
            } else if (payload.type === 'typing' && payload.sender === 'admin') {
              if (
                conversationRef.current &&
                (!payload.session_id || payload.session_id === conversationRef.current.session_id)
              ) {
                if (payload.is_typing) {
                  setAdminTyping(true);
                  if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = window.setTimeout(() => {
                    setAdminTyping(false);
                  }, 3500);
                } else {
                  setAdminTyping(false);
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          socketRef.current = null;
          if (pingIntervalRef.current) {
            window.clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          if (isCancelled) return;

          isReconnectingRef.current = true;
          const delay = retryDelayRef.current;
          retryDelayRef.current = Math.min(delay * 2, 30000);

          retryTimeoutRef.current = window.setTimeout(() => {
            connectWebSocket();
          }, delay);
        };

        ws.onerror = () => {
          // ws.onclose handles scheduling reconnect
        };
      } catch {
        if (!isCancelled) {
          isReconnectingRef.current = true;
          const delay = retryDelayRef.current;
          retryDelayRef.current = Math.min(delay * 2, 30000);
          retryTimeoutRef.current = window.setTimeout(connectWebSocket, delay);
        }
      }
    };

    connectWebSocket();

    return () => {
      isCancelled = true;
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        window.clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [conversation?.session_id, fetchMissedMessages, upsertTicketItem]);

  // Start chat handler
  const handleStartChat = async (e?: React.FormEvent, forceNew = false) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!user) {
      if (!guestForm.name.trim()) {
        setFormError('Please enter your name.');
        return;
      }
      const digits = guestForm.phone.replace(/\D/g, '');
      if (digits.length < 10) {
        setFormError('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (guestForm.email.trim() && !guestForm.email.includes('@')) {
        setFormError('Please enter a valid email address.');
        return;
      }

      localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(guestForm));
    }

    setLoading(true);
    try {
      const existingSession = forceNew ? undefined : (localStorage.getItem(STORAGE_KEY_SESSION) || undefined);
      const payload = user
        ? { session_id: existingSession }
        : {
            name: guestForm.name.trim(),
            email: guestForm.email.trim() || undefined,
            phone: guestForm.phone.trim(),
            session_id: existingSession
          };

      const res = await initSupportConversation(payload);
      if (res.data?.data) {
        const conv = res.data.data;
        setConversation(conv);
        setMessages(conv.messages || []);
        localStorage.setItem(STORAGE_KEY_SESSION, conv.session_id);
        saveSessionToList(conv.session_id);
        upsertTicketItem(toListItem(conv));
        setWidgetView('chat');

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'subscribe',
              session_ids: Array.from(new Set([conv.session_id, ...getStoredSessions()]))
            })
          );
        }
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string; message?: string } } }).response?.data?.detail ||
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Failed to start chat. Please try again.'
        : 'Failed to start chat. Please check your internet connection.';
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorInputChange = (value: string) => {
    setInputText(value);
    if (
      conversation?.session_id &&
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: 'typing',
          session_id: conversation.session_id,
          is_typing: value.trim().length > 0
        })
      );
    }
  };

  // Send message handler (via WebSocket when open, with HTTP fallback)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !conversation || sending) return;

    if (conversation.status === 'closed' || conversation.status === 'resolved') {
      setFormError(`This ticket is ${conversation.status}. Please reopen the ticket to continue chatting.`);
      return;
    }

    setInputText('');
    setSending(true);

    const tempId = -Date.now();
    const optimisticMsg: SupportMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_type: user ? 'user' : 'guest',
      sender_name: user ? user.name : (guestForm.name || 'You'),
      message: text,
      is_read: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(
          JSON.stringify({
            type: 'send_message',
            session_id: conversation.session_id,
            message: text,
            temp_id: tempId
          })
        );
        setSending(false);
        return;
      } catch {
        // Fall through to HTTP API if WebSocket send fails
      }
    }

    try {
      const res = await sendSupportVisitorMessage(conversation.session_id, text);
      if (res.data?.data) {
        const confirmed = res.data.data;
        setMessages(prev => {
          if (prev.some(m => m.id === confirmed.id)) {
            return prev.filter(m => m.id !== tempId);
          }
          return prev.map(m => (m.id === tempId ? confirmed : m));
        });
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleOpenTicketsList = async () => {
    setWidgetView('tickets');
    setLoadingTickets(true);
    try {
      const stored = getStoredSessions();
      const currentId = conversation?.session_id;
      const allIds = Array.from(new Set([...(currentId ? [currentId] : []), ...stored])).join(',');

      // Pass phone, name and email to fetch all matching tickets (both logged-in user and guest)
      const phone = conversation?.display_phone || user?.phone || guestForm.phone || '';
      const name = conversation?.display_name || user?.name || guestForm.name || '';
      const email = conversation?.display_email || user?.email || guestForm.email || '';

      const res = await getMySupportTickets(
        allIds || undefined,
        phone || undefined,
        name || undefined,
        email || undefined
      );
      if (res.data?.data) {
        setTicketsList(res.data.data);
      }
    } catch {
      // Ignore tickets fetch error
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleOpenTicketsFromChoice = () => {
    setShowChoiceMenu(false);
    setIsOpen(true);
    void handleOpenTicketsList();
  };

  const handleSelectTicket = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await getSupportConversation(sessionId);
      if (res.data?.data) {
        const conv = res.data.data;
        setConversation(conv);
        setMessages(conv.messages || []);
        localStorage.setItem(STORAGE_KEY_SESSION, conv.session_id);
        saveSessionToList(conv.session_id);
        upsertTicketItem(toListItem(conv));
        setWidgetView('chat');
      }
    } catch {
      setFormError('Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewTicket = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    setConversation(null);
    setMessages([]);
    setWidgetView('chat');
    if (user) {
      void handleStartChat(undefined, true);
    }
  };

  const handleReopenTicket = async () => {
    if (!conversation?.session_id || reopening) return;
    setReopening(true);
    try {
      const res = await reopenSupportConversation(conversation.session_id);
      if (res.data?.data) {
        const conv = res.data.data;
        setConversation(conv);
        setMessages(conv.messages || []);
        upsertTicketItem(toListItem(conv));
      }
    } catch {
      setFormError('Failed to reopen ticket. Please try again.');
    } finally {
      setReopening(false);
    }
  };

  const handleOpenLiveChat = () => {
    setShowChoiceMenu(false);
    setIsOpen(true);
    setUnreadCount(0);
    if (user && !conversation) {
      void handleStartChat();
    }
  };

  const handleOpenWhatsApp = () => {
    setShowChoiceMenu(false);
    window.open('https://wa.me/919992292828?text=Hello%20TradeCall%20Support%2C%20I%20have%20an%20enquiry.', '_blank', 'noopener,noreferrer');
  };

  const dismissTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(false);
    localStorage.setItem(STORAGE_KEY_DISMISS_TOOLTIP, '1');
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <style>{`
        /* Choice menu backdrop (mobile bottom sheet) */
        .tc-choice-backdrop {
          display: none;
        }

        /* Choice Popup Menu (Desktop default) */
        .tc-choice-menu {
          position: fixed;
          bottom: 95px;
          right: 24px;
          width: 320px;
          max-width: calc(100vw - 32px);
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);
          z-index: 9999;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          animation: tcSlideUp 0.25s ease;
        }

        .tc-bottom-sheet-handle {
          display: none;
        }

        .tc-bottom-sheet-cancel-btn {
          display: none;
        }

        /* Live Chat Window (Desktop default) */
        .tc-chat-window {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 380px;
          max-width: calc(100vw - 32px);
          height: 580px;
          max-height: calc(100vh - 48px);
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22), 0 4px 16px rgba(0, 0, 0, 0.08);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          animation: tcSlideUp 0.25s ease;
        }

        /* Header */
        .tc-chat-header {
          padding: 12px 14px;
          background-color: #0c6253;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .tc-header-back-btn {
          display: none;
        }

        .tc-desktop-back-btn {
          display: flex;
        }

        /* Compact Visitor bar */
        .tc-visitor-info-bar {
          padding: 7px 14px;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          flex-shrink: 0;
        }

        /* Composer */
        .tc-chat-composer {
          padding: 10px 14px;
          background-color: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .tc-chat-input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 24px;
          font-size: 13.5px;
          outline: none;
          box-sizing: border-box;
          background-color: #f8fafc;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .tc-chat-input:focus {
          border-color: #0c6253;
          background-color: #ffffff;
        }

        .tc-chat-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: #0c6253;
          color: #ffffff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
          transition: background-color 0.2s, transform 0.15s;
        }

        .tc-chat-send-btn:active {
          transform: scale(0.92);
        }

        .tc-chat-send-btn:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
          transform: none;
        }

        /* Locked bar */
        .tc-chat-locked-bar {
          padding: 12px 14px;
          background-color: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-shrink: 0;
        }

        .tc-locked-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 12px;
          color: #475569;
          line-height: 1.35;
        }

        .tc-locked-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #e6f4f1;
          color: #0c6253;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          flex-shrink: 0;
        }

        .tc-reopen-btn {
          flex: 1;
          padding: 10px 14px;
          background-color: #0c6253;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background-color 0.15s ease;
        }

        .tc-new-ticket-btn {
          flex: 1;
          padding: 10px 14px;
          background-color: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .tc-brand-footer {
          padding: 4px;
          text-align: center;
          font-size: 10.5px;
          color: #94a3b8;
          background-color: #ffffff;
          border-top: 1px solid #f1f5f9;
          flex-shrink: 0;
        }

        /* =====================================================================
           Mobile Viewport (<= 640px) - Professional Native Chat UI
           ===================================================================== */
        @media (max-width: 640px) {
          /* Backdrop overlay for choice menu */
          .tc-choice-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(2px);
            z-index: 99998;
            animation: tcFadeIn 0.2s ease;
          }

          /* Choice Bottom Sheet */
          .tc-choice-menu {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-width: 100%;
            background-color: #ffffff;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.22);
            z-index: 99999;
            overflow: hidden;
            border: none;
            animation: tcSlideUpMobile 0.25s ease-out;
            padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          }

          .tc-bottom-sheet-handle {
            display: block;
            width: 38px;
            height: 4px;
            border-radius: 2px;
            background-color: #cbd5e1;
            margin: 10px auto 4px auto;
          }

          .tc-bottom-sheet-cancel-btn {
            display: block;
            width: 100%;
            padding: 12px;
            background-color: #f1f5f9;
            border: none;
            border-radius: 12px;
            color: #64748b;
            font-size: 13.5px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 4px;
          }

          /* Fullscreen Chat Window on Mobile */
          .tc-chat-window {
            position: fixed !important;
            inset: 0 !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100% !important;
            height: 100dvh !important;
            max-width: 100vw !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            z-index: 99999 !important;
            animation: tcSlideInRight 0.25s ease-out;
          }

          /* Chat Header with Notch / Safe Area support */
          .tc-chat-header {
            padding-top: calc(10px + env(safe-area-inset-top, 0px));
            padding-bottom: 10px;
            padding-left: 10px;
            padding-right: 12px;
            gap: 8px;
          }

          .tc-header-back-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.18);
            border: none;
            color: #ffffff;
            font-size: 14px;
            cursor: pointer;
            flex-shrink: 0;
          }

          .tc-header-back-btn:active {
            background: rgba(255, 255, 255, 0.3);
          }

          .tc-desktop-back-btn {
            display: none !important;
          }

          /* Composer with bottom safe area */
          .tc-chat-composer {
            padding-top: 10px;
            padding-left: 12px;
            padding-right: 12px;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            background-color: #ffffff;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
          }

          .tc-chat-input {
            font-size: 14px;
            padding: 11px 16px;
            background-color: #f8fafc;
          }

          .tc-chat-send-btn {
            width: 42px;
            height: 42px;
            font-size: 16px;
          }

          .tc-chat-locked-bar {
            padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
          }

          .tc-reopen-btn, .tc-new-ticket-btn {
            padding: 12px 14px;
            font-size: 13.5px;
          }

          /* Hide brand footer on mobile to keep maximum conversation space */
          .tc-brand-footer {
            display: none;
          }

          /* Hide floating launcher when chat window is active on mobile */
          .tc-floating-launcher.tc-hidden-on-chat-open {
            display: none !important;
          }
        }

        /* Animations */
        @keyframes tcSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes tcSlideUpMobile {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes tcSlideInRight {
          from {
            opacity: 0;
            transform: translateX(15px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes tcFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>

      {/* =========================================================================
          Choice Popup Menu (Desktop Popup / Mobile Bottom Sheet)
         ========================================================================= */}
      {showChoiceMenu && !isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="tc-choice-backdrop"
            onClick={() => setShowChoiceMenu(false)}
          />

          <div
            role="dialog"
            aria-label="Contact options"
            className="tc-choice-menu"
          >
            {/* Grab handle for mobile bottom sheet */}
            <div className="tc-bottom-sheet-handle" />

            {/* Header */}
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: '#0c6253',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    display: 'inline-block',
                    boxShadow: '0 0 6px #22c55e'
                  }}
                />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Customer Support</span>
              </div>
              <button
                onClick={() => setShowChoiceMenu(false)}
                aria-label="Close menu"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px'
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', fontSize: '13px', color: '#475569' }}>
              How would you like to connect with our support team?
            </div>

            {/* Action List */}
            <div style={{ padding: '10px 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Live Chat Agent */}
              <button
                onClick={handleOpenLiveChat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0c6253';
                  e.currentTarget.style.backgroundColor = '#f0fdf9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#0c6253',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-comments" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#0f172a' }}>
                    Chat with Live Agent
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Instant web chat • We typically reply in minutes
                  </div>
                </div>
                <i className="fas fa-chevron-right" style={{ color: '#94a3b8', fontSize: '12px' }} />
              </button>

              {/* Option 2: WhatsApp */}
              <button
                onClick={handleOpenWhatsApp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#25d366';
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#25d366',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0
                  }}
                >
                  <i className="fab fa-whatsapp" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#0f172a' }}>
                    Chat on WhatsApp
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    +91 99922 92828 • Connect directly in WhatsApp
                  </div>
                </div>
                <i className="fas fa-external-link-alt" style={{ color: '#94a3b8', fontSize: '12px' }} />
              </button>

              {/* Option 3: All Support Tickets */}
              <button
                onClick={handleOpenTicketsFromChoice}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0c6253';
                  e.currentTarget.style.backgroundColor = '#f0fdf9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e6f4f1',
                    color: '#0c6253',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0
                  }}
                >
                  <i className="fas fa-history" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14.5px', color: '#0f172a' }}>
                    All Support Tickets
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    View past tickets & resolutions
                  </div>
                </div>
                <i className="fas fa-chevron-right" style={{ color: '#94a3b8', fontSize: '12px' }} />
              </button>

              {/* Cancel Button on Mobile */}
              <button
                type="button"
                onClick={() => setShowChoiceMenu(false)}
                className="tc-bottom-sheet-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          Live Chat Full Card (Responsive: Fullscreen on mobile, popup on desktop)
         ========================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Customer Support Live Chat"
          className="tc-chat-window"
        >
          {/* Chat Header */}
          <div className="tc-chat-header">
            {/* Mobile-only Back/Close Button */}
            <button
              type="button"
              className="tc-header-back-btn"
              onClick={widgetView === 'tickets' ? () => setWidgetView('chat') : () => setIsOpen(false)}
              aria-label={widgetView === 'tickets' ? 'Back to chat' : 'Close chat'}
            >
              <i className="fas fa-chevron-left" />
            </button>

            {widgetView === 'tickets' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <button
                  type="button"
                  className="tc-desktop-back-btn"
                  onClick={() => setWidgetView('chat')}
                  title="Back to chat"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#ffffff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}
                >
                  <i className="fas fa-arrow-left" />
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    My Support Tickets
                  </div>
                  <div style={{ fontSize: '11px', color: '#a7f3d0' }}>
                    View past tickets & resolutions
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      color: '#ffffff'
                    }}
                  >
                    <i className="fas fa-headset" />
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor:
                        conversation?.status === 'closed' || conversation?.status === 'resolved'
                          ? '#94a3b8'
                          : '#22c55e',
                      border: '2px solid #0c6253'
                    }}
                  />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '14.5px',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Customer Support
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#a7f3d0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '3px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {conversation ? (
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          lineHeight: 1.3,
                          backgroundColor:
                            conversation.status === 'open'
                              ? 'rgba(34, 197, 94, 0.25)'
                              : conversation.status === 'in_progress'
                              ? 'rgba(56, 189, 248, 0.25)'
                              : conversation.status === 'resolved'
                              ? 'rgba(192, 132, 252, 0.25)'
                              : 'rgba(255, 255, 255, 0.15)',
                          color:
                            conversation.status === 'open'
                              ? '#bbf7d0'
                              : conversation.status === 'in_progress'
                              ? '#bae6fd'
                              : conversation.status === 'resolved'
                              ? '#e9d5ff'
                              : '#e2e8f0',
                          border: '1px solid rgba(255, 255, 255, 0.22)'
                        }}
                      >
                        {conversation.status.replace('_', ' ')}
                      </span>
                    ) : (
                      <span>Online</span>
                    )}
                    <span>•</span>
                    <span>TradeCall India</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={widgetView === 'tickets' ? () => setWidgetView('chat') : handleOpenTicketsList}
                title={widgetView === 'tickets' ? 'Back to active chat' : 'View all support tickets'}
                style={{
                  background: widgetView === 'tickets' ? '#ffffff' : 'rgba(255,255,255,0.18)',
                  border: 'none',
                  color: widgetView === 'tickets' ? '#0c6253' : '#ffffff',
                  height: '28px',
                  padding: '0 10px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                <i className={widgetView === 'tickets' ? 'fas fa-comments' : 'fas fa-history'} />
                <span>{widgetView === 'tickets' ? 'Chat' : 'All Tickets'}</span>
              </button>
              <button
                onClick={handleOpenWhatsApp}
                title="Switch to WhatsApp"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px'
                }}
              >
                <i className="fab fa-whatsapp" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          {/* Chat Body: Tickets List OR Pre-chat Form OR Message Feed */}
          {widgetView === 'tickets' ? (
            /* Tickets History List View */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  All Tickets ({ticketsList.length})
                </span>
                <button
                  type="button"
                  onClick={handleStartNewTicket}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#e6f4f1',
                    color: '#0c6253',
                    border: '1px solid #c6f2e2',
                    borderRadius: '14px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <i className="fas fa-plus" /> New Ticket
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {loadingTickets ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '13px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }} /> Loading tickets...
                  </div>
                ) : ticketsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px' }}>
                    <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '8px', display: 'block', color: '#cbd5e1' }} />
                    No previous support tickets found.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ticketsList.map((t) => {
                      const isCurrent = conversation?.session_id === t.session_id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => void handleSelectTicket(t.session_id)}
                          style={{
                            padding: '12px',
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            border: isCurrent ? '1.5px solid #0c6253' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                              Ticket ID: #{t.id} {isCurrent && <span style={{ fontSize: '10.5px', color: '#0c6253', fontWeight: 600 }}>(Active)</span>}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                padding: '2px 7px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                textTransform: 'capitalize',
                                backgroundColor:
                                  t.status === 'open'
                                    ? '#dcfce7'
                                    : t.status === 'in_progress'
                                    ? '#e0f2fe'
                                    : t.status === 'resolved'
                                    ? '#f3e8ff'
                                    : '#f1f5f9',
                                color:
                                  t.status === 'open'
                                    ? '#15803d'
                                    : t.status === 'in_progress'
                                    ? '#0369a1'
                                    : t.status === 'resolved'
                                    ? '#7e22ce'
                                    : '#475569'
                              }}
                            >
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#64748b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginBottom: '4px'
                            }}
                          >
                            {t.last_message_text || 'Conversation started'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="far fa-clock" style={{ fontSize: '10px' }} />
                            {formatTime(t.last_message_at)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : !conversation ? (
            /* Pre-Chat Screen */
            <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#e6f4f1',
                      color: '#0c6253',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      marginBottom: '8px'
                    }}
                  >
                    <i className="fas fa-comment-dots" />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                    How can we help?
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    {user
                      ? `Welcome back, ${user.name}! Start chatting with our customer support.`
                      : 'Please enter your contact details to connect with our live customer support.'}
                  </p>
                </div>

                {formError && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#dc2626',
                      fontSize: '12.5px',
                      marginBottom: '14px'
                    }}
                  >
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }} />
                    {formError}
                  </div>
                )}

                {user ? (
                  /* Signed-in user view */
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        textAlign: 'left'
                      }}
                    >
                      <div>
                        <strong>Name:</strong> {user.name}
                      </div>
                      <div>
                        <strong>Email:</strong> {user.email}
                      </div>
                      {user.phone && (
                        <div>
                          <strong>Phone:</strong> {user.phone}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleStartChat()}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#0c6253',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin" /> Starting Chat...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane" /> Start Live Chat
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenTicketsList}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#ffffff',
                        color: '#0c6253',
                        border: '1px solid #0c6253',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fas fa-history" /> View All Tickets
                    </button>
                  </div>
                ) : (
                  /* Guest Visitor Form (Name, Email, Phone) */
                  <form onSubmit={handleStartChat} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        * Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={guestForm.name}
                        onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        * Mobile Number
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span
                          style={{
                            padding: '9px 10px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#475569'
                          }}
                        >
                          +91
                        </span>
                        <input
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={guestForm.phone}
                          onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                          required
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '13px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={guestForm.email}
                        onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        marginTop: '6px',
                        padding: '12px',
                        backgroundColor: '#0c6253',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin" /> Connecting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane" /> Start Chat
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenTicketsList}
                      style={{
                        marginTop: '2px',
                        width: '100%',
                        padding: '9px',
                        backgroundColor: '#ffffff',
                        color: '#0c6253',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fas fa-history" /> View All Tickets
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* Active Live Chat Thread View */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', minHeight: 0 }}>
              {/* Visitor / User Contact Info Bar */}
              <div className="tc-visitor-info-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <i className="fas fa-user-circle" style={{ color: '#0c6253', fontSize: '14px', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                    {conversation.display_name || user?.name || guestForm.name || 'Visitor'}
                  </span>
                  {(conversation.display_phone || user?.phone || guestForm.phone) && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b' }}>
                      • {conversation.display_phone || user?.phone || guestForm.phone}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#0c6253',
                    backgroundColor: '#e6f4f1',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  Ticket ID: #{conversation.id}
                </span>
              </div>

              {/* Message List */}
              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Intro notice banner */}
                <div
                  style={{
                    alignSelf: 'center',
                    backgroundColor: '#e6f4f1',
                    border: '1px solid #bbf7d0',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    color: '#065f46',
                    textAlign: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '2px auto 6px auto',
                    maxWidth: '92%'
                  }}
                >
                  <i className="fas fa-shield-alt" />
                  Live chat active • Support team online
                </div>

                {messages.map((m) => {
                  const isVisitor = m.sender_type === 'user' || m.sender_type === 'guest';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isVisitor ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        alignSelf: isVisitor ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: '#64748b',
                          marginBottom: '3px',
                          paddingLeft: isVisitor ? '0' : '4px',
                          paddingRight: isVisitor ? '4px' : '0'
                        }}
                      >
                        {isVisitor ? 'You' : m.sender_name || 'Customer Support'} • {formatTime(m.created_at)}
                      </div>
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: isVisitor ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          backgroundColor: isVisitor ? '#0c6253' : '#ffffff',
                          color: isVisitor ? '#ffffff' : '#1e293b',
                          fontSize: '13px',
                          lineHeight: 1.45,
                          boxShadow: isVisitor
                            ? '0 2px 6px rgba(12,98,83,0.2)'
                            : '0 2px 6px rgba(0,0,0,0.06)',
                          border: isVisitor ? 'none' : '1px solid #e2e8f0',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })}

                {adminTyping && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      fontSize: '11.5px',
                      color: '#64748b',
                      fontStyle: 'italic',
                      padding: '4px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px'
                    }}
                  >
                    <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '6px', color: '#0c6253' }} />
                    Support agent is typing...
                  </div>
                )}

                {(conversation?.status === 'closed' || conversation?.status === 'resolved') && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: '8px 0 4px 0'
                    }}
                  >
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.2px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <i className="fas fa-check-circle" style={{ color: '#0c6253', fontSize: '11px' }} />
                      Ticket {conversation.status === 'resolved' ? 'Resolved' : 'Closed'}
                    </span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                  </div>
                )}
              </div>

              {/* Message Composer Footer OR Closed/Resolved Ticket Action Footer */}
              {conversation?.status === 'closed' || conversation?.status === 'resolved' ? (
                <div className="tc-chat-locked-bar">
                  <div className="tc-locked-notice">
                    <div className="tc-locked-icon">
                      <i className="fas fa-lock" />
                    </div>
                    <span>
                      This ticket is {conversation.status}. Reopen it to send a message or start a new ticket.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleReopenTicket}
                      disabled={reopening}
                      className="tc-reopen-btn"
                    >
                      <i className={reopening ? 'fas fa-spinner fa-spin' : 'fas fa-redo-alt'} />
                      {reopening ? 'Reopening...' : 'Reopen Ticket'}
                    </button>
                    <button
                      type="button"
                      onClick={handleStartNewTicket}
                      className="tc-new-ticket-btn"
                    >
                      <i className="fas fa-plus" />
                      New Ticket
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenTicketsList}
                      className="tc-new-ticket-btn"
                    >
                      <i className="fas fa-history" />
                      All Tickets
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="tc-chat-composer"
                >
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => handleVisitorInputChange(e.target.value)}
                    disabled={sending}
                    className="tc-chat-input"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    aria-label="Send message"
                    className="tc-chat-send-btn"
                  >
                    {sending ? (
                      <i className="fas fa-spinner fa-spin" />
                    ) : (
                      <i className="fas fa-paper-plane" />
                    )}
                  </button>
                </form>
              )}

              {/* Brand Footer */}
              <div className="tc-brand-footer">
                Powered by TradeCall India
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          Unified Floating WhatsApp & Support Button (Bottom Right)
         ========================================================================= */}
      <div
        className={`tc-floating-launcher ${isOpen ? 'tc-hidden-on-chat-open' : ''}`}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}
      >
        {/* Tooltip / Prompt pill (Hostycare-style) */}
        {showTooltip && !isOpen && !showChoiceMenu && (
          <div
            onClick={() => setShowChoiceMenu(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0c6253',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '20px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              userSelect: 'none',
              animation: 'bounceIn 0.3s ease'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 6px #22c55e'
              }}
            />
            <span>Chat with live agent now</span>
            <button
              onClick={dismissTooltip}
              aria-label="Dismiss message"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: '13px',
                opacity: 0.8
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              setShowChoiceMenu(prev => !prev);
            }
          }}
          aria-label="Customer Support and WhatsApp"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: isOpen ? '#0c6253' : '#25d366',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isOpen ? '24px' : '32px',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isOpen ? (
            <i className="fas fa-chevron-down" />
          ) : (
            <i className="fab fa-whatsapp" />
          )}

          {/* Unread badge */}
          {unreadCount > 0 && !isOpen && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                border: '2px solid #ffffff'
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

