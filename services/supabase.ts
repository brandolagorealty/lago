
import { createClient } from '@supabase/supabase-js';
import { Property, PropertyType, Agent, PropertyStatus } from '../types';

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
  status: string;
  agent_ids?: string[];
  agent_notes?: any; // Changed from string to any for JSONB
  created_at?: string;
}

export interface AgentDB {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
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
  features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
  featured: p.featured,
  status: p.status as PropertyStatus,
  isPublished: p.is_published,
  agentIds: p.agent_ids || [], // Map array of agent IDs
  agentNotes: p.agent_notes || []
});

export const propertyService = {
  // Get all published properties
  async getPublishedProperties(): Promise<Property[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
      return [];
    }

    return data.map(p => mapProperty(p as PropertyDB));
  },

  // Get ALL properties including drafts for admin
  async getAdminProperties(): Promise<Property[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin properties:', error);
      return [];
    }

    // Since mapProperty already handles isPublished, we just return the mapped results
    return data.map((p) => mapProperty(p as PropertyDB));
  },

  // Get single property by ID
  async getPropertyById(id: string): Promise<Property | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching property:', error);
      return null;
    }

    return mapProperty(data as PropertyDB);
  },

  // Create a new property
  // isPublished lets admins publish directly or save as draft
  async createProperty(property: Omit<Property, 'id'>, isPublished: boolean = false): Promise<{ success: boolean; error?: any; data?: any }> {
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
      is_published: isPublished, // Draft vs Published
      status: property.status || 'available',
      agent_ids: property.agentIds || [], // Array of assigned agents
      agent_notes: property.agentNotes || []
    };

    const { data, error } = await supabase
      .from('properties')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      return { success: false, error };
    }

    return { success: true, data };
  },

  // Get all agents
  async getAgents(): Promise<Agent[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching agents:', error);
      return [];
    }

    return data.map((a: any) => ({
      ...a,
      avatar: a.avatar_url,
    }));
  },

  // Get agents by IDs
  async getAgentsByIds(ids: string[]): Promise<Agent[]> {
    if (!supabase || !ids || ids.length === 0) return [];
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('Error fetching agents by ids:', error);
      return [];
    }

    return (data || []).map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      email: a.email,
      phone: a.phone,
      avatar: a.avatar_url,
    }));
  },

  // Create an agent
  async createAgent(agent: Omit<Agent, 'id'>): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    const dbPayload = {
      name: agent.name,
      role: agent.role,
      email: agent.email,
      phone: agent.phone || null,
      avatar_url: agent.avatar
    };

    const { data, error } = await supabase
      .from('agents')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  // Update an agent
  async updateAgent(id: string, updates: Partial<Agent>): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;

    const { error } = await supabase
      .from('agents')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating agent:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Delete an agent
  async deleteAgent(id: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting agent:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Upload Agent Avatar
  async uploadAgentAvatar(file: File): Promise<string | null> {
    if (!supabase) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `agent_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('agents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading agent avatar:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('agents')
      .getPublicUrl(fileName);

    return data.publicUrl;
  },

  // Update property
  async updateProperty(id: string, updates: Partial<Property>): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    // Convert frontend model to DB model for the updates
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.listingType !== undefined) dbUpdates.listing_type = updates.listingType;
    if (updates.beds !== undefined) dbUpdates.beds = updates.beds;
    if (updates.baths !== undefined) dbUpdates.baths = updates.baths;
    if (updates.sqft !== undefined) dbUpdates.sqft = updates.sqft;
    if (updates.image !== undefined) dbUpdates.image_url = updates.image;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.shortDescription !== undefined) dbUpdates.short_description = updates.shortDescription;
    if (updates.features !== undefined) dbUpdates.features = updates.features;
    if (updates.featured !== undefined) dbUpdates.featured = updates.featured;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.agentIds !== undefined) dbUpdates.agent_ids = updates.agentIds || null;
    if (updates.agentNotes !== undefined) dbUpdates.agent_notes = updates.agentNotes;

    const { error } = await supabase
      .from('properties')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating property:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Delete property
  async deleteProperty(id: string): Promise<{ success: boolean; count?: number; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    const { error, count } = await supabase
      .from('properties')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting property:', error);
      return { success: false, error: error.message };
    }

    console.log(`Deletion attempt for ${id}: ${count} rows affected.`);
    return { success: true, count: count || 0 };
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
  },

  // CRM: Create a new lead from contact forms
  async createLead(leadData: { name: string; email: string; phone: string; message: string; property_id?: string; agent_id?: string }): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    const { error } = await supabase
      .from('leads')
      .insert([leadData]);

    if (error) {
      console.error('Error creating lead:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // CRM: Get all leads for admin dashboard
  async getLeads(): Promise<any[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
    return data || [];
  },

  // CRM: Update lead status
  async updateLeadStatus(id: string, status: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error updating lead status:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // CRM: Update lead agent
  async updateLeadAgent(id: string, agent_id: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    const { error } = await supabase
      .from('leads')
      .update({ agent_id })
      .eq('id', id);

    if (error) {
      console.error('Error updating lead agent:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }
};
