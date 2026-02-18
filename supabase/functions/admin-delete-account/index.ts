import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");
    
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
    const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin only");

    const { userId, reason } = await req.json();
    if (!userId) throw new Error("userId required");

    // Get user email before deletion
    const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
    if (!targetUser) throw new Error("User not found");

    // Delete all user data in cascade
    await Promise.all([
      supabase.from("comments").delete().eq("user_id", userId),
      supabase.from("post_likes").delete().eq("user_id", userId),
      supabase.from("post_favorites").delete().eq("user_id", userId),
      supabase.from("follows").delete().eq("follower_id", userId),
      supabase.from("follows").delete().eq("following_id", userId),
      supabase.from("messages").delete().eq("sender_id", userId),
      supabase.from("notifications").delete().eq("user_id", userId),
      supabase.from("notifications").delete().eq("related_user_id", userId),
      supabase.from("group_members").delete().eq("user_id", userId),
      supabase.from("stories").delete().eq("user_id", userId),
      supabase.from("reports").delete().eq("reporter_id", userId),
    ]);

    // Delete posts
    await supabase.from("posts").delete().eq("user_id", userId);

    // Delete profile
    await supabase.from("profiles").delete().eq("user_id", userId);

    // Delete user roles
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // Ban email
    if (targetUser.email) {
      await supabase.from("banned_emails").upsert({
        email: targetUser.email.toLowerCase(),
        banned_by: caller.id,
        reason: reason || "Compte supprimé par admin",
      }, { onConflict: "email" });
    }

    // Delete auth user
    await supabase.auth.admin.deleteUser(userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
