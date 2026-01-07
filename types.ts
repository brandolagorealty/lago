
export type ViewState = 'home' | 'listings' | 'about' | 'contact';

export type PropertyType = 'Apartment' | 'House' | 'Commercial' | 'Land';

export interface PropertyFeatures {
  general: string[];
  interior: string[];
  exterior: string[];
}

export interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  type: PropertyType; // In DB this is text, but we enforce specific types in UI
  listingType: 'sale' | 'rent'; // New field for Buy/Rent distinction
  beds: number;
  baths: number;
  sqft: number;
  image: string; // Mapped from image_url (Primary image)
  images?: string[]; // Gallery images
  description: string;
  shortDescription?: string; // Short summary for cards
  features?: PropertyFeatures; // Grouped features
  featured: boolean;
}

export interface FilterState {
  type: PropertyType | 'Any Type';
  listingType: 'sale' | 'rent' | 'any'; // Filter for listing type
  minPrice: string;
  maxPrice: string;
  location: string;
}
