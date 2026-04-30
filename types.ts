
export type ViewState = 'home' | 'listings' | 'about' | 'contact';

export type PropertyType = 'Apartment' | 'House' | 'Commercial' | 'Land';

export interface PropertyFeatures {
  general: string[];
  interior: string[];
  exterior: string[];
}

export type PropertyStatus = 'available' | 'sold' | 'rented' | 'reserved';

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email: string;
  phone?: string;
  bookingUrl?: string;
}

export interface PropertyNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  agentName?: string;
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
  status: PropertyStatus;
  isPublished: boolean;
  agentIds?: string[];
  agentNotes?: PropertyNote[];
  updatedAt?: string;
}

export interface FilterState {
  type: PropertyType | 'Any Type';
  listingType: 'sale' | 'rent' | 'any'; // Filter for listing type
  minPrice: string;
  maxPrice: string;
  location: string;
}

export type LeadStatus = 'new' | 'contacted' | 'visiting' | 'negotiating' | 'closed' | 'lost';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  property_id?: string;
  agent_id?: string;
  created_by?: string; // ID del usuario que creó el prospecto
  shared_with?: string[]; // IDs de usuarios con acceso a ver el prospecto
  status: LeadStatus;
  notes?: any[]; // Reusing the JSON structure similar to agentNotes
  created_at: string;
}

export type UserRoleType = 'superadmin' | 'asesor';

export interface UserRole {
  id: string;
  user_id: string;
  email: string;
  role: UserRoleType;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN';
  table_name: string;
  record_id: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface LagoTask {
  id: string;
  title: string;
  description?: string;
  link?: string;
  status: TaskStatus;
  due_date?: string;
  assignee_ids?: string[];
  assignor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_email: string;
  text: string;
  created_at: string;
}

export type NotificationType = 'task_assigned' | 'task_updated' | 'new_lead' | 'property_status' | 'system';

export interface LagoNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link_tab?: string;
  link_record_id?: string;
  is_read: boolean;
  created_at: string;
}

// Farming Inmobiliario
export interface Recorrido {
  id: string;
  agente_id?: string;
  agente_email?: string;
  zona_nombre: string;
  coordenadas_ruta: { lat: number; lng: number }[];
  fecha_inicio: string;
  fecha_fin?: string;
  distancia_metros: number;
  created_at: string;
}

export interface Captacion {
  id: string;
  recorrido_id?: string;
  agente_id?: string;
  latitud: number;
  longitud: number;
  tipo_inmueble: string;
  estatus: string;
  telefono_contacto?: string;
  notas?: string;
  created_at: string;
}

export interface ZonaFarming {
  id: string;
  nombre: string;
  poligono: { lat: number; lng: number }[];
  color: string;
  asignado_a?: string;
  asignado_email?: string;
  meta_km: number;
  km_recorridos: number;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  prioridad: number;
  created_by?: string;
  created_at: string;
}
