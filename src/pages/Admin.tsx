import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Shield, Ban, Trash2, AlertTriangle, Check, X, Search, Users, FileWarning, ChevronDown, ChevronUp
} from "lucide-react";
import CertificationBadge from "@/components/CertificationBadge";

interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
}

interface Profile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  is_verified: boolean;
  certification_type: string | null;
  ban_reason: string | null;
}

export default function Admin() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reports" | "users" | "banned">("reports");

  // Reports
  const [reports, setReports] = useState<Report[]>([]);
  const [reportProfiles, setReportProfiles] = useState<Map<string, Profile>>(new Map());

  // Users
  const [users, setUsers] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [bannedEmails, setBannedEmails] = useState<any[]>([]);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; username: string } | null>(null);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!data);
    setLoading(false);
    if (data) {
      fetchReports();
      fetchUsers();
      fetchBannedEmails();
    }
  };

  const fetchReports = async () => {
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (data) {
      setReports(data);
      // Fetch profiles for reporters and reported users
      const ids = [...new Set(data.flatMap(r => [r.reporter_id, r.reported_user_id].filter(Boolean) as string[]))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", ids);
        setReportProfiles(new Map((profiles || []).map(p => [p.user_id, p as Profile])));
      }
    }
  };

  const fetchUsers = async () => {
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    if (userSearch.trim()) {
      query = supabase.from("profiles").select("*").or(`username.ilike.%${userSearch}%,display_name.ilike.%${userSearch}%`).limit(50);
    }
    const { data } = await query;
    if (data) setUsers(data as Profile[]);
  };

  const fetchBannedEmails = async () => {
    const { data } = await supabase.from("banned_emails").select("*").order("created_at", { ascending: false });
    if (data) setBannedEmails(data);
  };

  const handleBanUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_banned: true, ban_reason: banReason || "Banni par admin" }).eq("user_id", userId);
    toast.success("Utilisateur banni");
    setConfirmAction(null);
    setBanReason("");
    fetchUsers();
  };

  const handleUnbanUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_banned: false, ban_reason: null }).eq("user_id", userId);
    toast.success("Utilisateur débanni");
    fetchUsers();
  };

  const handleDeleteAccount = async (userId: string) => {
    const token = session?.access_token;
    if (!token) return;

    const res = await supabase.functions.invoke("admin-delete-account", {
      body: { userId, reason: banReason || "Supprimé par admin" },
    });
    if (res.error) {
      toast.error("Erreur: " + (res.error.message || "Échec de suppression"));
    } else {
      toast.success("Compte supprimé définitivement");
      fetchUsers();
      fetchBannedEmails();
    }
    setConfirmAction(null);
    setBanReason("");
  };

  const handleReportAction = async (reportId: string, status: string) => {
    await supabase.from("reports").update({ status }).eq("id", reportId);
    toast.success(status === "resolved" ? "Signalement résolu" : "Signalement rejeté");
    fetchReports();
  };

  const handleUnbanEmail = async (id: string) => {
    await supabase.from("banned_emails").delete().eq("id", id);
    toast.success("Email débanni");
    fetchBannedEmails();
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [userSearch]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <Shield size={48} className="text-destructive" />
      <h2 className="text-xl font-bold text-foreground">Accès refusé</h2>
      <p className="text-muted-foreground text-center">Vous n'avez pas les droits d'administration.</p>
      <button onClick={() => navigate("/")} className="gradient-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium">Retour</button>
    </div>
  );

  return (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={22} /></button>
          <Shield size={20} className="text-primary" />
          <h2 className="font-display font-bold text-foreground">Admin Panel</h2>
        </div>
        <div className="flex max-w-2xl mx-auto">
          {([
            { key: "reports", label: "Signalements", icon: FileWarning },
            { key: "users", label: "Utilisateurs", icon: Users },
            { key: "banned", label: "Emails bannis", icon: Ban },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                tab === key ? "text-primary border-primary" : "text-muted-foreground border-transparent"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* REPORTS TAB */}
        {tab === "reports" && (
          <>
            {reports.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FileWarning size={40} className="mx-auto mb-3 opacity-50" />
                <p>Aucun signalement</p>
              </div>
            ) : reports.map((r) => {
              const reporter = reportProfiles.get(r.reporter_id);
              const reported = r.reported_user_id ? reportProfiles.get(r.reported_user_id) : null;
              return (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-accent" />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.status === "pending" ? "bg-accent/20 text-accent" : r.status === "resolved" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {r.status === "pending" ? "En attente" : r.status === "resolved" ? "Résolu" : "Rejeté"}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{r.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Par @{reporter?.username || "inconnu"}
                        {reported && <> → @{reported.username}</>}
                        {r.reported_post_id && <> (post)</>}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at || "").toLocaleDateString("fr-FR")}</p>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleReportAction(r.id, "resolved")} className="p-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30">
                          <Check size={16} />
                        </button>
                        <button onClick={() => handleReportAction(r.id, "dismissed")} className="p-2 bg-muted text-muted-foreground rounded-xl hover:bg-secondary">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {reported && r.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setConfirmAction({ type: "ban", userId: reported.user_id, username: reported.username })}
                        className="text-xs px-3 py-1.5 bg-destructive/20 text-destructive rounded-xl hover:bg-destructive/30 flex items-center gap-1"
                      >
                        <Ban size={12} /> Bannir
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "delete", userId: reported.user_id, username: reported.username })}
                        className="text-xs px-3 py-1.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Supprimer le compte
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Rechercher un utilisateur..."
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            {users.map((u) => (
              <div key={u.user_id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : u.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</p>
                    {u.certification_type && <CertificationBadge type={u.certification_type} size={14} />}
                    {u.is_banned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium">BANNI</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {u.is_banned ? (
                    <button onClick={() => handleUnbanUser(u.user_id)} className="text-xs px-3 py-1.5 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30">
                      Débannir
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmAction({ type: "ban", userId: u.user_id, username: u.username })}
                      className="p-2 bg-destructive/20 text-destructive rounded-xl hover:bg-destructive/30"
                    >
                      <Ban size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmAction({ type: "delete", userId: u.user_id, username: u.username })}
                    className="p-2 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* BANNED EMAILS TAB */}
        {tab === "banned" && (
          <>
            {bannedEmails.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Ban size={40} className="mx-auto mb-3 opacity-50" />
                <p>Aucun email banni</p>
              </div>
            ) : bannedEmails.map((b) => (
              <div key={b.id} className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.email}</p>
                  <p className="text-xs text-muted-foreground">{b.reason} · {new Date(b.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <button onClick={() => handleUnbanEmail(b.id)} className="text-xs px-3 py-1.5 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30">
                  Débannir
                </button>
              </div>
            ))}
          </>
        )}
      </main>

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6" onClick={() => setConfirmAction(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-destructive">
              {confirmAction.type === "delete" ? <Trash2 size={20} /> : <Ban size={20} />}
              <h3 className="font-bold text-foreground">
                {confirmAction.type === "delete" ? "Supprimer définitivement" : "Bannir"} @{confirmAction.username} ?
              </h3>
            </div>
            {confirmAction.type === "delete" && (
              <p className="text-xs text-muted-foreground">Toutes les données seront supprimées et l'email sera banni. Cette action est irréversible.</p>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Raison</label>
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground mt-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="Raison..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => confirmAction.type === "delete" ? handleDeleteAccount(confirmAction.userId) : handleBanUser(confirmAction.userId)}
                className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-xl text-sm font-medium"
              >
                Confirmer
              </button>
              <button onClick={() => { setConfirmAction(null); setBanReason(""); }} className="px-4 py-2.5 bg-secondary rounded-xl text-muted-foreground text-sm">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
