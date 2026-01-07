
import { createClient } from '@supabase/supabase-js';
import { Property, PropertyType } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
  }
} else {
  console.warn('Missing Supabase environment variables. Running in local/offline mode.');
}

export const supabase = supabaseInstance;

export interface PropertyDB {
  id: string;
  title: string;
  price: number;
  location: string;
  type: string;
  listing_type: string; // Map from DB column
  beds: number;
  baths: number;
  sqft: number;
  image_url: string;
  images: string[]; // Array of image URLs
  description: string;
  short_description: string;
  features: any; // jsonb
  featured: boolean;
  is_published: boolean;
  created_at?: string;
}

// Mapper to convert DB property to App property
const mapProperty = (p: PropertyDB): Property => ({
  id: p.id,
  title: p.title,
  price: p.price,
  location: p.location,
  type: p.type as PropertyType,
  listingType: (p.listing_type === 'rent' ? 'rent' : 'sale'), // Default to sale if null/undefined
  beds: p.beds,
  baths: p.baths,
  sqft: p.sqft,
  image: p.image_url, // Map image_url to image for frontend compatibility
  images: p.images || [], // Map gallery images
  description: p.description,
  shortDescription: p.short_description,
  features: p.features || { general: [], interior: [], exterior: [] },
  featured: p.featured,
});

export const propertyService = {
  // Get all published properties
  async getPublishedProperties(): Promise<Property[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty list');
      return [];
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
      return [];
    }

    return (data as PropertyDB[]).map(mapProperty);
  },

  // Get single property by ID
  async getPropertyById(id: string): Promise<Property | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching property:', error);
      return null;
    }

    return mapProperty(data as PropertyDB);
  },

  // Create a new property
  // allowPublishedOverride lets admins publish directly
  async createProperty(property: Omit<Property, 'id'>, isPublished: boolean = false): Promise<{ success: boolean; error?: any }> {
    if (!supabase) {
      console.warn('Supabase not configured, cannot create property');
      return { success: false, error: 'Supabase client not initialized' };
    }

    // Convert frontend model to DB model
    const dbPayload = {
      title: property.title,
      price: property.price,
      location: property.location,
      type: property.type,
      listing_type: property.listingType, // Save the listing type
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      image_url: property.image,
      images: property.images, // Save gallery
      description: property.description,
      short_description: property.shortDescription,
      features: property.features,
      featured: property.featured,
      is_published: isPublished // Use the passed parameter
    };

    const { error } = await supabase
      .from('properties')
      .insert([dbPayload]);

    if (error) {
      console.error('Error creating property:', error);
      return { success: false, error };
    }

    return { success: true };
  },

  // Upload image to Storage
  async uploadImage(file: File): Promise<string | null> {
    if (!supabase) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('properties')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('properties')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
