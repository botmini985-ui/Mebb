
-- Table to store banned emails (prevent re-registration)
CREATE TABLE public.banned_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  banned_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage banned emails
CREATE POLICY "Admins view banned emails"
ON public.banned_emails FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert banned emails"
ON public.banned_emails FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete banned emails"
ON public.banned_emails FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update report status
CREATE POLICY "Admins update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow reporters to view their own reports
CREATE POLICY "Users view own reports"
ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);
