import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, LogOut, User, Shield, Moon, Bell, Lock, ChevronRight } from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const togglePrivate = async () => {
    if (!user) return;
    const newVal = !isPrivate;
    setIsPrivate(newVal);
    await supabase.from("profiles").update({ is_private: newVal }).eq("user_id", user.id);
    toast.success(newVal ? "Compte privé activé" : "Compte public");
  };

  const sections = [
    {
      title: "Compte",
      items: [
        { icon: User, label: "Modifier le profil", onClick: () => navigate("/profile") },
        { icon: Lock, label: isPrivate ? "Compte privé ✓" : "Passer en privé", onClick: togglePrivate },
      ],
    },
    {
      title: "Préférences",
      items: [
        { icon: Bell, label: "Notifications", onClick: () => navigate("/notifications") },
        { icon: Moon, label: "Mode sombre", onClick: () => toast.info("Mode sombre activé par défaut") },
      ],
    },
    {
      title: "Sécurité",
      items: [
        { icon: Shield, label: "Confidentialité", onClick: () => toast.info("Paramètres de confidentialité") },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display font-bold text-foreground">Paramètres</h2>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{section.title}</h3>
            <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
                >
                  <item.icon size={20} className="text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-destructive/10 border border-destructive/20 rounded-2xl hover:bg-destructive/20 transition-colors"
        >
          <LogOut size={20} className="text-destructive" />
          <span className="text-sm font-semibold text-destructive">Se déconnecter</span>
        </button>

        <p className="text-center text-xs text-muted-foreground pt-4">PURGE HUB v1.0</p>
      </main>
    </div>
  );
}
