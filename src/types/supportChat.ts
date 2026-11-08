export type SupportSenderType = 'user' | 'guest' | 'admin' | 'bot';
export type SupportConversationStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportMessage {
  id: number;
  conversation_id: number;
  sender_type: SupportSenderType;
  sender_id?: number | null;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SupportConversation {
  id: number;
  session_id: string;
  user_id?: number | null;
  display_name: string;
  display_email?: string | null;
  display_phone?: string | null;
  is_registered_user: boolean;
  status: SupportConversationStatus;
  unread_admin_count: number;
  unread_user_count: number;
  last_message_at: string;
  created_at: string;
  messages: SupportMessage[];
}

export interface SupportConversationListItem {
  id: number;
  session_id: string;
  user_id?: number | null;
  display_name: string;
  display_email?: string | null;
  display_phone?: string | null;
  is_registered_user: boolean;
  status: SupportConversationStatus;
  unread_admin_count: number;
  unread_user_count: number;
  last_message_text?: string | null;
  last_message_at: string;
  created_at: string;
}

export interface SupportAdminCounts {
  all: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  unread_total: number;
}

export interface SupportAdminListResponse {
  items: SupportConversationListItem[];
  total: number;
  page: number;
  limit: number;
  counts: SupportAdminCounts;
}

export interface SupportInitPayload {
  name?: string;
  email?: string;
  phone?: string;
  session_id?: string;
}

