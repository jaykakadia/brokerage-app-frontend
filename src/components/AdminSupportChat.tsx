import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getAdminSupportConversations,
  getAdminSupportConversationDetail,
  sendAdminSupportReply,
  updateAdminSupportStatus,
  deleteAdminSupportConversation,
  pollSupportMessages,
  getApiErrorMessage,
  API_BASE_URL
} from '../services/api';
import {
  playNotificationSound,
  requestNotificationPermission,
  triggerDesktopNotification
} from '../utils/audioNotification';
import type {
  SupportConversation,
  SupportConversationListItem,
  SupportAdminCounts,
  SupportConversationStatus,
  SupportMessage
} from '../types';

export interface AdminSupportChatProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onCountsChange?: (counts: SupportAdminCounts) => void;
}

const EMPTY_COUNTS: SupportAdminCounts = {
  all: 0,
  open: 0,
  in_progress: 0,
  resolved: 0,
  closed: 0,
  unread_total: 0
};

const CANNED_REPLIES = [
  'Hello! How can I assist you today?',
  'Thank you for reaching out. Let me check the details for this property/listing.',
  'Could you please share your preferred location or budget?',
  'Our team has noted your query and will update you shortly.',
  'Is there anything else I can help you with today?'
];

function matchesFilter(
  item: SupportConversationListItem,
  tab: SupportConversationStatus | 'all',
  query: string
): boolean {
  if (tab !== 'all' && item.status !== tab) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const numClean = q.replace(/^#/, '');
  if (numClean && !isNaN(Number(numClean)) && item.id === Number(numClean)) {
    return true;
  }
  return (
    (item.display_name || '').toLowerCase().includes(q) ||
    (item.display_email || '').toLowerCase().includes(q) ||
    (item.display_phone || '').toLowerCase().includes(q)
  );
}

export default function AdminSupportChat({ showToast, onCountsChange }: AdminSupportChatProps) {
  const [statusTab, setStatusTab] = useState<SupportConversationStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<SupportConversationListItem[]>([]);
  const [counts, setCounts] = useState<SupportAdminCounts>(EMPTY_COUNTS);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeConv, setActiveConv] = useState<SupportConversation | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [visitorTypingSession, setVisitorTypingSession] = useState<string | null>(null);

  const [notificationsAllowed, setNotificationsAllowed] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const retryDelayRef = useRef<number>(1000);
  const isReconnectingRef = useRef<boolean>(false);

  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;
  const activeConvRef = useRef<SupportConversation | null>(activeConv);
  activeConvRef.current = activeConv;
  const statusTabRef = useRef<SupportConversationStatus | 'all'>(statusTab);
  statusTabRef.current = statusTab;
  const searchRef = useRef<string>(search);
  searchRef.current = search;
  const onCountsChangeRef = useRef(onCountsChange);
  onCountsChangeRef.current = onCountsChange;

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    });
  };

  useEffect(() => {
    if (activeConv?.messages) {
      scrollToBottom();
    }
  }, [activeConv?.messages, visitorTypingSession]);

  // Check notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsAllowed(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsAllowed(granted);
    if (granted) {
      showToast('Notifications enabled!', 'success');
    } else {
      showToast('Notification permission was blocked or denied.', 'error');
    }
  };

  const applyCounts = useCallback((nextCounts?: SupportAdminCounts) => {
    if (!nextCounts) return;
    setCounts(nextCounts);
    onCountsChangeRef.current?.(nextCounts);
  }, []);

  const upsertConversationInList = useCallback((item?: SupportConversationListItem) => {
    if (!item) return;
    setConversations(prev => {
      const passes = matchesFilter(item, statusTabRef.current, searchRef.current);
      const exists = prev.some(c => c.id === item.id);
      if (!passes) {
        return exists ? prev.filter(c => c.id !== item.id) : prev;
      }
      const filtered = prev.filter(c => c.id !== item.id);
      const next = [item, ...filtered];
      next.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      return next;
    });
  }, []);

  // Fetch conversations list
  const loadConversations = useCallback(async (tab: string, query: string, quiet = false) => {
    if (!quiet) setLoadingList(true);
    try {
      const res = await getAdminSupportConversations({
        status: tab === 'all' ? undefined : tab,
        search: query.trim() || undefined,
        page: 1,
        limit: 50
      });
      if (res.data?.data) {
        setConversations(res.data.data.items);
        applyCounts(res.data.data.counts);
      }
    } catch (err) {
      if (!quiet) showToast(getApiErrorMessage(err, 'Failed to load conversations'), 'error');
    } finally {
      if (!quiet) setLoadingList(false);
    }
  }, [showToast, applyCounts]);

  // Initial load & when tab / search changes
  useEffect(() => {
    void loadConversations(statusTab, search);
  }, [statusTab, search, loadConversations]);

  // Load specific conversation detail
  const loadConversationDetail = useCallback(async (convId: number) => {
    setLoadingConv(true);
    try {
      const res = await getAdminSupportConversationDetail(convId);
      if (res.data?.data) {
        setActiveConv(res.data.data);
        setConversations(prev =>
          prev.map(c => (c.id === convId ? { ...c, unread_admin_count: 0 } : c))
        );
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to load conversation details'), 'error');
    } finally {
      setLoadingConv(false);
    }
  }, [showToast]);

  const handleSelectConversation = (convId: number) => {
    setSelectedId(convId);
    void loadConversationDetail(convId);
  };

  // On reconnect, fetch missed messages once using /poll?after_id=<last message id>, then stop.
  const fetchMissedAdminMessages = useCallback(async () => {
    void loadConversations(statusTabRef.current, searchRef.current, true);

    const currentConv = activeConvRef.current;
    if (currentConv && currentConv.session_id) {
      const validMsgs = currentConv.messages.filter(m => m.id > 0);
      const lastId = validMsgs.length > 0 ? Math.max(...validMsgs.map(m => m.id)) : 0;
      if (lastId > 0) {
        try {
          const res = await pollSupportMessages(currentConv.session_id, lastId);
          if (res.data?.data && res.data.data.length > 0) {
            const fresh = res.data.data;
            setActiveConv(prev => {
              if (!prev || prev.id !== currentConv.id) return prev;
              const existingIds = new Set(prev.messages.map(m => m.id));
              const toAdd = fresh.filter(m => !existingIds.has(m.id));
              if (toAdd.length === 0) return prev;
              return {
                ...prev,
                messages: [...prev.messages, ...toAdd]
              };
            });
          }
        } catch {
          // Ignore reconnect poll error
        }
      }
    }
  }, [loadConversations]);

  // Persistent WebSocket for Real-time admin updates
  useEffect(() => {
    let isCancelled = false;

    const connectWebSocket = () => {
      if (isCancelled) return;

      let wsUrl: string;
      if (API_BASE_URL.startsWith('http')) {
        wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/api/v1/admin/support/ws';
      } else {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${wsProto}//${window.location.host}/api/v1/admin/support/ws`;
      }

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;
          retryDelayRef.current = 1000;

          if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25000);

          if (isReconnectingRef.current) {
            void fetchMissedAdminMessages();
            isReconnectingRef.current = false;
          }
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);

            if (payload.counts) {
              applyCounts(payload.counts);
            }

            if (payload.type === 'new_conversation' && payload.conversation) {
              const convItem: SupportConversationListItem = payload.conversation;
              upsertConversationInList(convItem);
              playNotificationSound();
              triggerDesktopNotification(
                `New Support Ticket: ${convItem.display_name}`,
                convItem.display_phone || convItem.display_email || 'New customer chat started'
              );
            } else if (payload.type === 'new_message' && payload.data) {
              const msg: SupportMessage & { temp_id?: number; session_id?: string } = payload.data;
              const isUserMessage = msg.sender_type === 'user' || msg.sender_type === 'guest';

              if (msg.session_id && visitorTypingSession === msg.session_id) {
                setVisitorTypingSession(null);
              }

              if (isUserMessage) {
                playNotificationSound();
                triggerDesktopNotification(
                  `Support: ${msg.sender_name || 'Customer'}`,
                  msg.message.length > 80 ? msg.message.slice(0, 77) + '...' : msg.message
                );
              }

              const isCurrentlyViewing = selectedIdRef.current === msg.conversation_id;

              if (payload.conversation) {
                const updatedConvItem: SupportConversationListItem = isCurrentlyViewing
                  ? { ...payload.conversation, unread_admin_count: 0 }
                  : payload.conversation;
                upsertConversationInList(updatedConvItem);
              } else {
                void loadConversations(statusTabRef.current, searchRef.current, true);
              }

              if (isCurrentlyViewing) {
                setActiveConv(prev => {
                  if (!prev || prev.id !== msg.conversation_id) return prev;
                  if (prev.messages.some(m => m.id === msg.id)) return prev;

                  const optIndex = prev.messages.findIndex(
                    m => (msg.temp_id && m.id === msg.temp_id) || (m.id < 0 && m.message === msg.message)
                  );
                  const nextStatus = payload.conversation?.status || prev.status;

                  if (optIndex !== -1) {
                    const updated = [...prev.messages];
                    updated[optIndex] = msg;
                    return { ...prev, status: nextStatus, messages: updated };
                  }

                  return {
                    ...prev,
                    status: nextStatus,
                    messages: [...prev.messages, msg]
                  };
                });

                // Mark read immediately over WebSocket if visitor sent a message while admin is viewing it
                if (isUserMessage && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'mark_read', conversation_id: msg.conversation_id }));
                }
              }
            } else if (payload.type === 'status_changed') {
              if (payload.conversation) {
                upsertConversationInList(payload.conversation);
              } else {
                void loadConversations(statusTabRef.current, searchRef.current, true);
              }
              if (payload.status) {
                setActiveConv(prev => {
                  if (!prev) return prev;
                  if (payload.conversation_id && prev.id !== payload.conversation_id) return prev;
                  if (payload.session_id && prev.session_id !== payload.session_id) return prev;
                  return { ...prev, status: payload.status };
                });
              }
            } else if (payload.type === 'conversation_read' && payload.conversation) {
              upsertConversationInList(payload.conversation);
            } else if (payload.type === 'conversation_deleted' && payload.conversation_id) {
              setConversations(prev => prev.filter(c => c.id !== payload.conversation_id));
              if (selectedIdRef.current === payload.conversation_id) {
                setSelectedId(null);
                setActiveConv(null);
              }
            } else if (payload.type === 'typing' && payload.sender === 'visitor') {
              if (payload.is_typing && payload.session_id) {
                setVisitorTypingSession(payload.session_id);
                if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = window.setTimeout(() => {
                  setVisitorTypingSession(null);
                }, 3500);
              } else {
                setVisitorTypingSession(null);
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
  }, [fetchMissedAdminMessages, applyCounts, upsertConversationInList, loadConversations]);

  const handleAdminTyping = (value: string) => {
    setReplyText(value);
    if (
      activeConv?.session_id &&
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: 'typing',
          session_id: activeConv.session_id,
          is_typing: value.trim().length > 0
        })
      );
    }
  };

  // Send admin reply (via WebSocket when connected, with HTTP fallback)
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedId || !replyText.trim() || sendingReply) return;

    if (activeConv?.status === 'closed' || activeConv?.status === 'resolved') {
      showToast(`This ticket is ${activeConv.status}. Change status to Open or In Progress to reply.`, 'error');
      return;
    }

    const text = replyText.trim();
    setReplyText('');
    setSendingReply(true);

    const tempId = -Date.now();
    const optimisticMsg: SupportMessage = {
      id: tempId,
      conversation_id: selectedId,
      sender_type: 'admin',
      sender_name: 'You (Support)',
      message: text,
      is_read: true,
      created_at: new Date().toISOString()
    };
    setActiveConv(prev =>
      prev
        ? {
            ...prev,
            status: prev.status === 'open' ? 'in_progress' : prev.status,
            messages: [...prev.messages, optimisticMsg]
          }
        : prev
    );

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(
          JSON.stringify({
            type: 'send_reply',
            conversation_id: selectedId,
            message: text,
            temp_id: tempId
          })
        );
        setSendingReply(false);
        return;
      } catch {
        // Fall through to HTTP API if WebSocket send fails
      }
    }

    try {
      const res = await sendAdminSupportReply(selectedId, text);
      if (res.data?.data) {
        const confirmed = res.data.data;
        setActiveConv(prev => {
          if (!prev) return prev;
          if (prev.messages.some(m => m.id === confirmed.id)) {
            return {
              ...prev,
              messages: prev.messages.filter(m => m.id !== tempId),
              status: prev.status === 'open' ? 'in_progress' : prev.status
            };
          }
          return {
            ...prev,
            messages: prev.messages.map(m => (m.id === tempId ? confirmed : m)),
            status: prev.status === 'open' ? 'in_progress' : prev.status
          };
        });
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to send reply'), 'error');
      setActiveConv(prev =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter(m => m.id !== tempId)
            }
          : prev
      );
      setReplyText(text);
    } finally {
      setSendingReply(false);
    }
  };

  // Change conversation status
  const handleStatusChange = async (newStatus: SupportConversationStatus) => {
    if (!selectedId || statusUpdating) return;
    setStatusUpdating(true);
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'update_status',
            conversation_id: selectedId,
            status: newStatus
          })
        );
        setActiveConv(prev => (prev ? { ...prev, status: newStatus } : null));
        showToast(`Status updated to ${newStatus}`, 'success');
      } else {
        await updateAdminSupportStatus(selectedId, newStatus);
        showToast(`Status updated to ${newStatus}`, 'success');
        setActiveConv(prev => (prev ? { ...prev, status: newStatus } : null));
        void loadConversations(statusTab, search, true);
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to update status'), 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Delete / Archive conversation
  const handleDeleteConversation = async () => {
    if (!selectedId) return;
    if (!window.confirm('Are you sure you want to delete this chat conversation?')) return;

    try {
      await deleteAdminSupportConversation(selectedId);
      showToast('Conversation deleted', 'success');
      setSelectedId(null);
      setActiveConv(null);
      setConversations(prev => prev.filter(c => c.id !== selectedId));
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to delete conversation'), 'error');
    }
  };

  const formatWhen = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: '620px', gap: '16px' }}>
      {/* Top Banner / Notification Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          padding: '12px 18px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#e6f4f1',
              color: '#0c6253',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            <i className="fas fa-headset" />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Customer Support Live Chat
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Real-time WebSocket messaging with website visitors and registered users
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!notificationsAllowed && (
            <button
              onClick={handleEnableNotifications}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-bell" style={{ color: '#0c6253' }} />
              Enable Desktop Alerts
            </button>
          )}

          <button
            onClick={() => void loadConversations(statusTab, search)}
            title="Refresh conversations"
            style={{
              padding: '6px 12px',
              backgroundColor: '#0c6253',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-sync-alt" />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Two-Column Split View */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: '16px',
          flex: 1,
          minHeight: 0
        }}
      >
        {/* Left Panel: Conversation Thread List */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          {/* Status Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}
          >
            {[
              { key: 'all', label: 'All', count: counts.all },
              { key: 'open', label: 'Open', count: counts.open },
              { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
              { key: 'resolved', label: 'Resolved', count: counts.resolved },
              { key: 'closed', label: 'Closed', count: counts.closed }
            ].map(t => {
              const isActive = statusTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setStatusTab(t.key as SupportConversationStatus | 'all')}
                  style={{
                    flex: 1,
                    padding: '9px 2px',
                    fontSize: '11.5px',
                    whiteSpace: 'nowrap',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#0c6253' : '#64748b',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #0c6253' : '2px solid transparent',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span>{t.label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#0c6253' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#475569'
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative' }}>
              <i
                className="fas fa-search"
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '12px'
                }}
              />
              <input
                type="text"
                placeholder="Search name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Conversation Cards List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                <i className="fas fa-inbox" style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }} />
                No conversations found.
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = selectedId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f0fdf9' : '#ffffff',
                      borderLeft: isSelected ? '4px solid #0c6253' : '4px solid transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                          {conv.display_name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            backgroundColor: conv.is_registered_user ? '#dcfce7' : '#f1f5f9',
                            color: conv.is_registered_user ? '#15803d' : '#64748b'
                          }}
                        >
                          {conv.is_registered_user ? 'User' : 'Guest'}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#0c6253',
                            backgroundColor: '#e6f4f1',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Ticket ID: #{conv.id}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {formatWhen(conv.last_message_at)}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                      {conv.display_phone || conv.display_email}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#475569',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '220px'
                        }}
                      >
                        {visitorTypingSession === conv.session_id ? (
                          <span style={{ color: '#0c6253', fontWeight: 600, fontStyle: 'italic' }}>
                            Typing...
                          </span>
                        ) : (
                          conv.last_message_text || 'Conversation initiated'
                        )}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {conv.unread_admin_count > 0 && (
                          <span
                            style={{
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '10px'
                            }}
                          >
                            {conv.unread_admin_count}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            backgroundColor:
                              conv.status === 'open'
                                ? '#fee2e2'
                                : conv.status === 'in_progress'
                                ? '#fef3c7'
                                : '#e2e8f0',
                            color:
                              conv.status === 'open'
                                ? '#b91c1c'
                                : conv.status === 'in_progress'
                                ? '#b45309'
                                : '#475569'
                          }}
                        >
                          {conv.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Conversation Thread & Message Feed */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          {loadingConv ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} />
              Loading conversation thread...
            </div>
          ) : !activeConv ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  color: '#94a3b8',
                  marginBottom: '12px'
                }}
              >
                <i className="fas fa-comments" />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>
                Select a conversation
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Choose a customer from the left list to view message history and reply.
              </div>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      {activeConv.display_name}
                    </h3>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor: activeConv.is_registered_user ? '#dcfce7' : '#f1f5f9',
                        color: activeConv.is_registered_user ? '#15803d' : '#64748b'
                      }}
                    >
                      {activeConv.is_registered_user ? 'Registered User' : 'Guest Visitor'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#0c6253',
                        backgroundColor: '#e6f4f1',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Ticket ID: #{activeConv.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '14px' }}>
                    {activeConv.display_phone && (
                      <span>
                        <i className="fas fa-phone-alt" style={{ marginRight: '4px' }} />
                        <a href={`tel:${activeConv.display_phone}`} style={{ color: '#0c6253', textDecoration: 'none' }}>
                          {activeConv.display_phone}
                        </a>
                      </span>
                    )}
                    {activeConv.display_email && (
                      <span>
                        <i className="fas fa-envelope" style={{ marginRight: '4px' }} />
                        <a href={`mailto:${activeConv.display_email}`} style={{ color: '#0c6253', textDecoration: 'none' }}>
                          {activeConv.display_email}
                        </a>
                      </span>
                    )}
                    {activeConv.display_phone && (
                      <span>
                        <a
                          href={`https://wa.me/91${activeConv.display_phone.replace(/\D/g, '').slice(-10)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#25d366', textDecoration: 'none', fontWeight: 600 }}
                        >
                          <i className="fab fa-whatsapp" style={{ marginRight: '4px' }} />
                          Open WhatsApp
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Status Dropdown */}
                  <select
                    value={activeConv.status}
                    onChange={(e) => void handleStatusChange(e.target.value as SupportConversationStatus)}
                    disabled={statusUpdating}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    onClick={handleDeleteConversation}
                    title="Delete Conversation"
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              </div>

              {/* Messages Feed */}
              <div
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  padding: '20px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  backgroundColor: '#f8fafc'
                }}
              >
                {activeConv.messages.map(m => {
                  const isAdmin = m.sender_type === 'admin';
                  const isBot = m.sender_type === 'bot';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAdmin ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        alignSelf: isAdmin ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          marginBottom: '3px',
                          paddingLeft: isAdmin ? '0' : '4px',
                          paddingRight: isAdmin ? '4px' : '0'
                        }}
                      >
                        {isAdmin ? 'You (Support)' : isBot ? 'Automated System' : m.sender_name} • {formatWhen(m.created_at)}
                      </div>
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: isAdmin ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          backgroundColor: isAdmin ? '#0c6253' : isBot ? '#fef3c7' : '#ffffff',
                          color: isAdmin ? '#ffffff' : isBot ? '#78350f' : '#1e293b',
                          fontSize: '13.5px',
                          lineHeight: 1.45,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          border: isBot ? '1px solid #fde68a' : isAdmin ? 'none' : '1px solid #e2e8f0',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })}

                {visitorTypingSession === activeConv.session_id && (
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      fontSize: '12px',
                      color: '#64748b',
                      fontStyle: 'italic',
                      padding: '4px 10px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '12px'
                    }}
                  >
                    <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '6px', color: '#0c6253' }} />
                    {activeConv.display_name} is typing...
                  </div>
                )}
              </div>

              {/* If conversation is closed or resolved, require reopening / in_progress */}
              {activeConv.status === 'closed' || activeConv.status === 'resolved' ? (
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#fffbeb',
                    borderTop: '1px solid #fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '13px', fontWeight: 500 }}>
                    <i className="fas fa-lock" />
                    <span>
                      This ticket is marked <strong>{activeConv.status}</strong>. Change status to <strong>Open</strong> or <strong>In Progress</strong> to send a reply.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => void handleStatusChange('in_progress')}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#0c6253',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: statusUpdating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fas fa-play" style={{ fontSize: '10px' }} />
                      Set to In Progress
                    </button>
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => void handleStatusChange('open')}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: statusUpdating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fas fa-undo" style={{ fontSize: '10px' }} />
                      Reopen Ticket
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Canned Responses Pills */}
                  <div
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflowX: 'auto'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                      Quick Replies:
                    </span>
                    {CANNED_REPLIES.map((rep, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAdminTyping(rep)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#334155',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {rep}
                      </button>
                    ))}
                  </div>

                  {/* Reply Composer Form */}
                  <form
                    onSubmit={handleSendReply}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#ffffff',
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Type your response to the customer..."
                      value={replyText}
                      onChange={(e) => handleAdminTyping(e.target.value)}
                      disabled={sendingReply}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: '13.5px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#0c6253';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || sendingReply}
                      style={{
                        padding: '10px 18px',
                        backgroundColor: !replyText.trim() || sendingReply ? '#94a3b8' : '#0c6253',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13.5px',
                        cursor: !replyText.trim() || sendingReply ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {sendingReply ? (
                        <i className="fas fa-spinner fa-spin" />
                      ) : (
                        <>
                          <i className="fas fa-paper-plane" />
                          Send Reply
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
