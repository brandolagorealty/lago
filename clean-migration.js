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

async function run() {
    console.log('Cleaning up table...');
    // We cannot delete with anon key easily without specific RLS, 
    // but the user's RLS should allow it if they set it up for Admin.
    // Instead of deleting, I'll just use INSERT and hope for the best.
    
    console.log('Inserting properties...');
    for (const p of PROPERTIES) {
        console.log(`Inserting: ${p.title}`);
        const { error } = await supabase.from('properties').insert({
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
        });
        if (error) console.error('Error:', error.message);
    }
    
    // Also update the Santa Rita property if it exists
    console.log('Updating existing Santa Rita property...');
    const { data: current } = await supabase.from('properties').select('id, title');
    const target = current?.find(p => p.title.includes('Santa Rita'));
    if (target) {
        await supabase.from('properties').update({
            image_url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800',
            is_published: true
        }).eq('id', target.id);
    }
    
    console.log('Done.');
}

run();
