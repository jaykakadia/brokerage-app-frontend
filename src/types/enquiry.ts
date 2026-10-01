export type EnquiryStatus = 'new' | 'in_progress' | 'resolved';

export interface Enquiry {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: EnquiryStatus;
  admin_note?: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface EnquiryCreate {
  name: string;
  email: string;
  phone: string;
  message: string;
  /** Honeypot: hidden on the form, left empty by real visitors */
  website?: string;
}

export type EnquiryCounts = Record<EnquiryStatus | 'all', number>;
