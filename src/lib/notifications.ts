import { supabase } from "@/integrations/supabase/client";

export async function sendNotification({
  userId,
  type,
  title,
  body,
  relatedUserId,
  relatedPostId,
}: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  relatedUserId?: string;
  relatedPostId?: string;
}) {
  // Don't notify yourself
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === userId) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body || null,
    related_user_id: relatedUserId || null,
    related_post_id: relatedPostId || null,
  });
}
