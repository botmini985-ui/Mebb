import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Users, Send } from "lucide-react";

export default function CreateGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("Nom du groupe requis"); return; }

    setLoading(true);
    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name: name.trim(), created_by: user.id, is_open: isOpen })
      .select()
      .single();

    if (error) { toast.error("Erreur: " + error.message); setLoading(false); return; }

    // Add creator as owner
    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "owner",
    });

    setLoading(false);
    toast.success("Groupe créé ! 🔥");
    navigate("/chat");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display font-bold text-foreground">Nouveau groupe</h2>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="gradient-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send size={14} />
            {loading ? "..." : "Créer"}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center">
            <Users size={36} className="text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nom du groupe</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Ex: Squad Gaming 🎮"
            maxLength={50}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type de groupe</label>
          <div className="flex gap-3">
            {[
              { value: true, label: "Ouvert", desc: "Tout le monde peut rejoindre" },
              { value: false, label: "Fermé", desc: "Sur invitation uniquement" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setIsOpen(opt.value)}
                className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                  isOpen === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:bg-muted"
                }`}
              >
                <p className="font-medium text-sm text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
