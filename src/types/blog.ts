export interface Blog {
  id: number;
  title: string;
  category: string;
  content: string;
  permalink: string;
  slug?: string;
  tags?: string | null;
  status: 'published' | 'draft' | 'publish' | string;
  author: string;
  image_url?: string | null;
  views?: number;
  created_at: string;
  updated_at: string;
}

export interface BlogCreate {
  title: string;
  category?: string;
  content: string;
  permalink?: string;
  slug?: string;
  tags?: string;
  status?: string;
  author?: string;
  image_url?: string;
}

export interface BlogUpdate {
  title?: string;
  category?: string;
  content?: string;
  permalink?: string;
  slug?: string;
  tags?: string;
  status?: string;
  author?: string;
  image_url?: string;
}
