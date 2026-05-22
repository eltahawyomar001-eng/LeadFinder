export interface Lead {
  place_id: string;
  name: string;
  phone: string | null;
  whatsapp_link: string | null;
  formatted_address: string;
  website: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  business_status: string;
  types: string[];
  weakness_score: number;
  weakness_reasons: string[];
  whatsapp_message: string;
}

export interface SearchRequest {
  category: string;
  city: string;
  radius: number;
  pageToken?: string;
}

export interface SearchResponse {
  leads: Lead[];
  nextPageToken?: string;
  total: number;
  withPhone: number;
  highPriority: number;
}

export interface GermanCity {
  name: string;
  lat: number;
  lng: number;
  state: string;
}

export type Priority = 'high' | 'medium' | 'low';
