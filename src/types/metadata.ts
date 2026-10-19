export interface PageMetadata {
  id: number;
  path: string;
  meta_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
}

export interface PageMetadataCreate {
  path: string;
  meta_title: string;
  meta_description: string;
}

export interface PageMetadataUpdate {
  path?: string;
  meta_title?: string;
  meta_description?: string;
}
