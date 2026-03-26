import { createClient } from '@supabase/supabase-js';
import { Property, PropertyType, Agent, PropertyStatus, Lead, UserRole, UserRoleType, AuditLog } from '../types';

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

// Helper to ensure we have a valid URL for Supabase
const ensureFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  // If it looks like a Supabase path (e.g. "image.jpg" or "propiedades/image.jpg")
  if (supabaseUrl && !url.includes(supabaseUrl)) {
      // Normalize: remove leading slash, replace legacy 'properties/' with 'propiedades/'
      let normalized = url.startsWith('/') ? url.substring(1) : url;
      if (normalized.startsWith('properties/')) {
        normalized = normalized.replace('properties/', 'propiedades/');
      }
      
      // If the URL doesn't start with a known bucket, prepend 'propiedades/'
      const hasBucket = normalized.startsWith('propiedades/') || normalized.startsWith('agents/');
      const finalPath = hasBucket ? normalized : `propiedades/${normalized}`;
      
      return `${supabaseUrl}/storage/v1/object/public/${finalPath}`;
  }
  return url;
};

export interface PropertyDB {
  id: string;
  title: string;
  price: number;
  location: string;
  type: string;
  listing_type: string; 
  beds: number;
  baths: number;
  sqft: number;
  image_url: string;
  images: string[]; 
  description: string;
  short_description: string;
  features: any; 
  featured: boolean;
  is_published: boolean;
  status: string;
  agent_ids?: string[];
  agent_notes?: any; 
  created_at?: string;
}

// Mapper to convert DB property to App property
const mapProperty = (p: PropertyDB): Property => ({
  id: p.id,
  title: p.title,
  price: p.price,
  location: p.location,
  type: p.type as PropertyType,
  listingType: (p.listing_type === 'rent' ? 'rent' : 'sale'),
  beds: p.beds,
  baths: p.baths,
  sqft: p.sqft,
  image: p.image_url, 
  images: p.images || [], 
  description: p.description,
  shortDescription: p.short_description,
  features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
  featured: p.featured,
  status: p.status as PropertyStatus,
  isPublished: p.is_published,
  agentIds: p.agent_ids || [], 
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
      console.error('[ADMIN] Error fetching admin properties:', error);
      return [];
    }

    console.log(`[ADMIN] getAdminProperties returned ${data?.length} rows. Published: ${data?.filter((p:any) => p.is_published).length}, Drafts: ${data?.filter((p:any) => !p.is_published).length}`);
    return data.map((p) => mapProperty(p as PropertyDB));
  },

  // Get single property by ID
  async getPropertyById(id: string): Promise<Property | null> {
    if (!supabase) return null;

    // Check if id is a valid UUID to avoid Postgres error 400
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      console.warn(`ID "${id}" is not a valid UUID. Attempting fallback by slug/title...`);
      const { data: fallbackData } = await supabase
        .from('properties')
        .select('*')
        .ilike('title', `%${id.replace(/-/g, ' ')}%`)
        .limit(1)
        .maybeSingle();

      if (fallbackData) return mapProperty(fallbackData as PropertyDB);
      return null;
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (error) console.error('Error fetching property:', error);
      return null;
    }

    return mapProperty(data as PropertyDB);
  },

  // Create a new property
  async createProperty(property: Omit<Property, 'id'>, isPublished: boolean = false): Promise<{ success: boolean; error?: any; data?: any }> {
    // Log the object being sent to the parent
    console.log('[DEBUG] propertyToSave in handleSaveBtn:', property.title, 'image:', property.image);
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };

    const dbPayload = {
      title: property.title,
      price: property.price,
      location: property.location,
      type: property.type,
      listing_type: property.listingType,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      image_url: ensureFullUrl(property.image || (property as any).image_url || ''),
      images: (property.images || []).map(ensureFullUrl),
      description: property.description,
      short_description: property.shortDescription,
      features: property.features,
      featured: property.featured,
      is_published: isPublished,
      agent_ids: property.agentIds || [],
      agent_notes: property.agentNotes || []
    };

    console.log('[DEBUG] supabase.ts: Final dbPayload for insert:', dbPayload.title, 'image_url:', dbPayload.image_url);

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
      avatar: a.avatar_url ? ensureFullUrl(a.avatar_url) : undefined,
      bookingUrl: a.booking_url
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
      avatar: a.avatar_url ? ensureFullUrl(a.avatar_url) : undefined,
      bookingUrl: a.booking_url
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
      avatar_url: agent.avatar,
      booking_url: agent.bookingUrl
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
    if (updates.bookingUrl !== undefined) dbUpdates.booking_url = updates.bookingUrl;

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
      .upload(fileName, file, { contentType: file.type, upsert: true });

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

    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.listingType !== undefined) dbUpdates.listing_type = updates.listingType;
    if (updates.beds !== undefined) dbUpdates.beds = updates.beds;
    if (updates.baths !== undefined) dbUpdates.baths = updates.baths;
    if (updates.sqft !== undefined) dbUpdates.sqft = updates.sqft;
    
    if (updates.image !== undefined) dbUpdates.image_url = ensureFullUrl(updates.image);
    else if ((updates as any).image_url !== undefined) dbUpdates.image_url = ensureFullUrl((updates as any).image_url);
    
    if (updates.images !== undefined) dbUpdates.images = (updates.images || []).map(ensureFullUrl);
    
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.shortDescription !== undefined) dbUpdates.short_description = updates.shortDescription;
    if (updates.features !== undefined) dbUpdates.features = updates.features;
    if (updates.featured !== undefined) dbUpdates.featured = updates.featured;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.agentIds !== undefined) dbUpdates.agent_ids = updates.agentIds || null;
    if (updates.agentNotes !== undefined) dbUpdates.agent_notes = updates.agentNotes;
    if (updates.isPublished !== undefined) dbUpdates.is_published = updates.isPublished;

    console.log('[DEBUG] supabase.ts: Final dbUpdates for update:', id, 'image_url:', dbUpdates.image_url);

    const { data, error } = await supabase
      .from('properties')
      .update(dbUpdates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating property:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.warn('Update successful (204) but 0 rows affected. Check RLS or ID correctness.');
      return { success: false, error: 'No se pudo actualizar la fila (posible error de permisos o ID)' };
    }
    
    console.log('[DEBUG] Update successful, rows affected:', data.length);
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

    return { success: true, count: count || 0 };
  },

  // Upload image to Storage
  async uploadImage(file: File): Promise<string | null> {
    if (!supabase) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`; 

    console.log('Uploading file to bucket "propiedades":', filePath);

    const { error: uploadError } = await supabase.storage
      .from('propiedades') // Correct bucket name
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error('Error uploading image to bucket "propiedades":', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('propiedades') // Correct bucket name
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // CRM: Create lead
  async createLead(leadData: any): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    const { error } = await supabase.from('leads').insert([leadData]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  // CRM: Get leads
  async getLeads(): Promise<any[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  },

  // CRM: Update lead status
  async updateLeadStatus(id: string, status: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    const { error } = await supabase.from('leads').update({ status }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  // SECURITY: Get the current user's own role via RPC (avoids recursive RLS)
  async getMyRole(): Promise<string> {
    if (!supabase) return 'asesor';
    const { data, error } = await supabase.rpc('get_my_role');
    if (error) {
      console.warn('Could not fetch role via RPC, defaulting to asesor:', error);
      return 'asesor';
    }
    return data || 'asesor';
  },

  // SECURITY: Get User Roles
  async getUserRoles(): Promise<UserRole[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
    return data || [];
  },

  // SECURITY: Create or Update User Role
  async manageUserRole(email: string, role: UserRoleType): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    
    // Note: Inserting a user role requires the user_id if they already exist in auth.users,
    // but the actual invite logic creates the auth.user first. 
    // For now, if we create manually, we need to know the user_id.
    // If we only have email, this needs an Edge Function to create the user securely.
    // We will rely on the Edge function for creation, but this is the frontend placeholder.
    return { success: false, error: 'Please use the Edge Function to invite users.' };
  },

  // SECURITY: Delete Auth User via Edge Function
  async deleteAuthUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    
    // Auth token needed to verify superadmin status in backend
    const sessionResult = await supabase.auth.getSession();
    const token = sessionResult?.data?.session?.access_token;
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
        const response = await fetch('/.netlify/functions/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId }),
        });
        const result = await response.json();
        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, error: result.error || 'Server error' };
        }
    } catch (e: any) {
        return { success: false, error: e.message || 'Connection error' };
    }
  },

  // SECURITY: Promote User to Superadmin
  async promoteUser(rowId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    
    const { error } = await supabase
        .from('user_roles')
        .update({ role: 'superadmin' })
        .eq('id', rowId);

    if (error) {
        console.error('Error promoting user:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
  },

  // SECURITY: Get Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    if (!supabase) return [];
    // Only superadmin can read this table
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    return data || [];
  }
};
