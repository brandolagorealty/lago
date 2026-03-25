import { createClient } from '@supabase/supabase-js';
import { PROPERTIES } from './data.js'; // Note: Node might need .js or we use a different way to import

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
    console.log('Starting migration of properties...');
    
    for (const prop of PROPERTIES) {
        console.log(`Migrating: ${prop.title}`);
        
        // Map frontend fields back to DB fields
        const dbPayload = {
            title: prop.title,
            price: prop.price,
            location: prop.location,
            type: prop.type,
            listing_type: prop.listingType || 'sale',
            beds: prop.beds,
            baths: prop.baths,
            sqft: prop.sqft,
            image_url: prop.image,
            images: prop.images || [],
            description: prop.description,
            short_description: prop.shortDescription || prop.description.substring(0, 100),
            featured: prop.featured || false,
            is_published: true, // Mark migrated as published
            status: 'available'
        };

        const { data, error } = await supabase
            .from('properties')
            .upsert([dbPayload], { onConflict: 'title' }) // Use title as unique for this migration
            .select();

        if (error) {
            console.error(`Error migrating ${prop.title}:`, error.message);
        } else {
            console.log(`Successfully migrated/updated: ${prop.title}`);
        }
    }
    
    console.log('Migration finished.');
}

migrate();
