-- =============================================================
-- LAGO REALTY: Storage Bucket Configuration
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================

-- 1. Create the 'propiedades' bucket (for property images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('propiedades', 'propiedades', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create the 'agents' bucket (for agent avatars)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agents', 'agents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- =============================================================
-- RLS POLICIES FOR 'propiedades' BUCKET
-- =============================================================

-- Allow anyone to read/view images (needed to display them publicly)
CREATE POLICY "Public read propiedades" ON storage.objects
FOR SELECT USING (bucket_id = 'propiedades');

-- Allow authenticated users to upload images
CREATE POLICY "Auth upload propiedades" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'propiedades');

-- Allow authenticated users to update/replace images
CREATE POLICY "Auth update propiedades" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'propiedades');

-- Allow authenticated users to delete images
CREATE POLICY "Auth delete propiedades" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'propiedades');

-- =============================================================
-- RLS POLICIES FOR 'agents' BUCKET
-- =============================================================

-- Allow anyone to read avatars
CREATE POLICY "Public read agents" ON storage.objects
FOR SELECT USING (bucket_id = 'agents');

-- Allow authenticated users to upload avatars
CREATE POLICY "Auth upload agents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agents');

-- Allow authenticated users to update avatars
CREATE POLICY "Auth update agents" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'agents');

-- Allow authenticated users to delete avatars
CREATE POLICY "Auth delete agents" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'agents');
