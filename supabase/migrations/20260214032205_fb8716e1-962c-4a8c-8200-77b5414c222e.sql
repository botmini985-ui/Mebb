
-- Create stories table
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories viewable by all" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Users create own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- Create banned_members table to track kicked users
CREATE TABLE public.banned_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.banned_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banned members viewable by group members" ON public.banned_group_members FOR SELECT USING (true);
CREATE POLICY "Admins ban members" ON public.banned_group_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = banned_group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin'))
);
CREATE POLICY "Admins unban members" ON public.banned_group_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = banned_group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('owner', 'admin'))
);

-- Storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

CREATE POLICY "Anyone can view media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Authenticated users upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
