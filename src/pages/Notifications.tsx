import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Heart, UserPlus, MessageCircle, AtSign, Shield, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const typeIcons: Record<string, any> = {
  like: Heart,
  follow: UserPlus,
  follow_request: UserPlus,
  message: MessageCircle,
  mention: AtSign,
  admin: Shield,
  comment: MessageCircle,
};

const typeColors: Record<string, string> = {
  like: "text-accent",
  follow: "text-primary",
  follow_request: "text-primary",
  message: "text-foreground",
  mention: "text-primary",
  admin: "text-destructive",
  comment: "text-foreground",
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data || []);

    // Mark all as read
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display font-bold text-foreground">Notifications</h2>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Bell size={48} className="mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] || Bell;
              const color = typeColors[n.type] || "text-foreground";
              return (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.is_read ? "bg-secondary/30" : ""}`}>
                  <div className={`mt-0.5 ${color}`}><Icon size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
