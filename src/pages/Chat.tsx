import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { MessageCircle, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    // Get latest message per conversation partner
    const { data } = await supabase
      .from("messages")
      .select("*, profiles!messages_sender_id_fkey(username, display_name, avatar_url)")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .is("group_id", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    // Deduplicate by conversation partner
    const seen = new Set<string>();
    const convos: any[] = [];
    (data || []).forEach((msg) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (partnerId && !seen.has(partnerId)) {
        seen.add(partnerId);
        convos.push({ ...msg, partnerId });
      }
    });
    setConversations(convos);
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <h2 className="font-display font-bold text-foreground text-lg">Messages</h2>
          <button className="p-2 text-primary"><Plus size={22} /></button>
        </div>
        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="Rechercher..."
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <MessageCircle size={48} className="mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Aucun message</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.partnerId}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                  {conv.profiles?.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-medium text-foreground text-sm truncate">{conv.profiles?.display_name || conv.profiles?.username}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(conv.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.content}</p>
                </div>
                {!conv.is_read && conv.receiver_id === user?.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
