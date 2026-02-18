import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Heart, UserPlus, MessageCircle, AtSign, Shield, Bell, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const typeIcons: Record<string, any> = {
  like: Heart,
  follow: UserPlus,
  follow_request: UserPlus,
  message: MessageCircle,
  mention: AtSign,
  admin: Shield,
  comment: MessageCircle,
  group_add: Users,
  verification: Shield,
};

const typeColors: Record<string, string> = {
  like: "text-accent",
  follow: "text-primary",
  follow_request: "text-primary",
  message: "text-foreground",
  mention: "text-primary",
  admin: "text-destructive",
  comment: "text-foreground",
  group_add: "text-primary",
  verification: "text-emerald-500",
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

  const handleClick = (n: any) => {
    if (n.related_post_id) {
      navigate(`/post/${n.related_post_id}`);
    } else if (n.related_user_id) {
      navigate(`/user/${n.related_user_id}`);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification supprimée");
  };

  const handleClearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
    toast.success("Toutes les notifications supprimées");
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={22} />
            </button>
            <h2 className="font-display font-bold text-foreground">Notifications</h2>
          </div>
          {notifications.length > 0 && (
            <button onClick={handleClearAll} className="text-xs text-destructive hover:underline font-medium">
              Tout effacer
            </button>
          )}
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
              const clickable = !!(n.related_post_id || n.related_user_id);
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 ${!n.is_read ? "bg-secondary/30" : ""} ${clickable ? "cursor-pointer active:bg-secondary/50" : ""}`}
                  onClick={() => clickable && handleClick(n)}
                >
                  <div className={`mt-0.5 ${color}`}><Icon size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                    className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
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
