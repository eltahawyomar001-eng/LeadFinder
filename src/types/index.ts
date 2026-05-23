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
  is_mobile: boolean;
  email: string | null;
  email_subject: string | null;
  email_body: string | null;
  website_builder?: string;
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

export type Country = 'de' | 'gb' | 'us' | 'sa' | 'ae';
export type PitchLang = 'de' | 'en' | 'ar';

export interface GermanCity {
  name: string;
  lat: number;
  lng: number;
  state: string;
}

export interface City {
  name: string;
  lat: number;
  lng: number;
  region: string;
  country: Country;
}

export interface GermanState {
  name: string;        // display name
  osmName: string;     // exact OSM "name" tag for area query
  lat: number;         // center for map display
  lng: number;
}

export type Priority = 'high' | 'medium' | 'low';

export const COUNTRY_INFO: Record<Country, { name: string; defaultLang: PitchLang }> = {
  de: { name: 'Germany',        defaultLang: 'de' },
  gb: { name: 'United Kingdom', defaultLang: 'en' },
  us: { name: 'United States',  defaultLang: 'en' },
  sa: { name: 'Saudi Arabia',   defaultLang: 'ar' },
  ae: { name: 'UAE',            defaultLang: 'ar' },
};

export type Source =
  | 'google'
  | 'osm'
  | 'here'
  | 'yelp'
  | 'foursquare'
  | 'dasoertliche'
  | 'gelbeseiten'
  | 'eleveneighty'
  | 'multi';
