import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Image, Video, Type, Send, ArrowLeft, Hash } from "lucide-react";

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "video">("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (!content && !mediaUrl) { toast.error("Ajoute du contenu"); return; }

    setLoading(true);
    const tags = hashtags.split(/[\s,#]+/).filter(Boolean);

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content,
      media_url: mediaUrl || null,
      media_type: mediaType,
      hashtags: tags,
    });

    setLoading(false);
    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Publication créée ! 🔥");
    navigate("/");
  };

  const mediaTypes = [
    { type: "text" as const, icon: Type, label: "Texte" },
    { type: "image" as const, icon: Image, label: "Image" },
    { type: "video" as const, icon: Video, label: "Vidéo" },
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-display font-bold text-foreground">Nouvelle publication</h2>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="gradient-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send size={14} />
            {loading ? "..." : "Publier"}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Media type selector */}
        <div className="flex gap-2">
          {mediaTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setMediaType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mediaType === type
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Qu'est-ce qui se passe ? 🔥"
          className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px] resize-none"
          maxLength={1000}
        />

        {/* Media URL */}
        {mediaType !== "text" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              URL {mediaType === "image" ? "de l'image" : "de la vidéo"}
            </label>
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://..."
            />
          </div>
        )}

        {/* Hashtags */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Hash size={12} /> Hashtags
          </label>
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="purge gaming vibe"
          />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
