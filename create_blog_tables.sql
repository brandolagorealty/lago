-- Tabla de Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content_markdown text NOT NULL,
  image_url text,
  author_id uuid REFERENCES auth.users(id),
  read_time_minutes integer DEFAULT 1,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Política: El público puede ver los posts publicados
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (is_published = true);

-- Política: Los superadmins pueden administrar todo en blog_posts
CREATE POLICY "Superadmins can manage blog posts"
  ON public.blog_posts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'superadmin'
    )
  );

-- Crear bucket de storage para las imágenes del blog
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Public Access to blog-images"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'blog-images' );

CREATE POLICY "Superadmins can manage blog-images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'blog-images' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'superadmin'
    )
  );
