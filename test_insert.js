import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scdztnzkzrvjgyefunkw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hAaLKJl_TStiL-NqgPfb-g_91rfJ63N';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
    console.log('Testing property insert with price 100000...');
    const payload = {
        title: "TEST PRICE TRIGGER",
        price: 100000,
        location: "Test Location",
        type: "House",
        is_published: false,
        description: "Test description",
        short_description: "Test short",
        listing_type: "sale",
        beds: 1,
        baths: 1,
        sqft: 1000,
        image_url: "http",
        images: [],
        features: {},
        featured: false,
        status: "available"
    };

    const { data, error } = await supabase
        .from('properties')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('Insert Error:', JSON.stringify(error, null, 2));
        return;
    }
    
    console.log('Inserted Price:', data.price);
    if (data.price !== 100000) {
        console.log(`WARNING: Price was modified! Expected: 100000, Got: ${data.price}`);
    } else {
        console.log('SUCCESS: Price was NOT modified.');
    }

    // Cleanup
    const { error: delError } = await supabase.from('properties').delete().eq('id', data.id);
    if (delError) {
        console.error('Delete Error:', delError);
    } else {
        console.log('Cleanup successful.');
    }
}

runTest();
