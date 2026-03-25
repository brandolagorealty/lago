import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PROPERTIES = [
  {
    title: 'Modern Villa in Lago Mar Beach',
    price: 450000,
    location: 'Maracaibo',
    type: 'House',
    beds: 4,
    baths: 4,
    sqft: 3500,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800',
    description: 'Stunning modern villa...',
    featured: true,
  },
  {
    title: 'Luxury Apartment in Tierra Negra',
    price: 180000,
    location: 'Maracaibo',
    type: 'Apartment',
    beds: 3,
    baths: 2,
    sqft: 1800,
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800',
    description: 'High-floor apartment...',
    featured: true,
  },
  {
    title: 'Commercial Space in Costa Mall',
    price: 350000,
    location: 'Cabimas',
    type: 'Commercial',
    beds: 0,
    baths: 1,
    sqft: 1200,
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
    description: 'Prime retail location...',
    featured: true,
  },
  {
    title: 'Colonial Home in Santa Rita center',
    price: 120000,
    location: 'Santa Rita',
    type: 'House',
    beds: 5,
    baths: 3,
    sqft: 2800,
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800',
    description: 'Beautifully restored...',
    featured: false,
  },
  {
    title: 'Industrial Plot in Ciudad Ojeda',
    price: 850000,
    location: 'Ciudad Ojeda',
    type: 'Land',
    beds: 0,
    baths: 0,
    sqft: 45000,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800',
    description: 'Large industrial land...',
    featured: false,
  },
  {
    title: 'Cozy Family Home in San Francisco',
    price: 95000,
    location: 'San Francisco',
    type: 'House',
    beds: 3,
    baths: 2,
    sqft: 1500,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?auto=format&fit=crop&q=80&w=800',
    description: 'Affordable and secure...',
    featured: true,
  }
];

async function migrate() {
    console.log('Starting full migration...');
    for (const p of PROPERTIES) {
        console.log(`Checking/Migrating: ${p.title}`);
        await supabase.from('properties').upsert({
            title: p.title,
            price: p.price,
            location: p.location,
            type: p.type,
            listing_type: 'sale',
            beds: p.beds,
            baths: p.baths,
            sqft: p.sqft,
            image_url: p.image,
            is_published: true,
            status: 'available',
            description: p.description,
            short_description: p.description.substring(0, 100),
            featured: p.featured
        }, { onConflict: 'title' });
    }
    console.log('Migration complete.');
}

migrate();
