"use client";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Plus, X, Pencil, Users, Trash2, Mail, UserCog } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  doctorId: string | null;
  createdAt: string;
};

const ROLES = [
  { value: "RECEPTIONIST", label: "Recepcionista" },
  { value: "DOCTOR", label: "Médico" },
  { value: "ADMIN", label: "Administrador" },
];

function roleBadgeClass(role: string) {
  if (role === "ADMIN") return "bg-violet-100 text-violet-700";
  if (role === "DOCTOR") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

function roleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

const EMPTY = { name: "", email: "", password: "", role: "RECEPTIONIST" };

export default function UsuariosPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const { data: rawUsers, mutate, isLoading } = useSWR<UserRow[] | { error: string }>("/api/users", fetcher);
  const userList: UserRow[] = Array.isArray(rawUsers) ? rawUsers : [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setErr(null);
    setOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setErr(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
    setErr(null);
  }

  async function save() {
    if (!form.name.trim()) { setErr("Nome é obrigatório"); return; }
    if (!form.email.trim()) { setErr("E-mail é obrigatório"); return; }
    if (!editing && !form.password) { setErr("Senha é obrigatória"); return; }
    if (form.password && form.password.length < 6) { setErr("Senha deve ter no mínimo 6 caracteres"); return; }

    setSaving(true);
    setErr(null);

    try {
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role };
      if (form.password) body.password = form.password;

      const res = editing
        ? await fetch(`/api/users/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");

      mutate();
      close();
    } catch (e: any) {
      setErr(e.message || "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setDeleteErr(null);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao excluir");
      setConfirmDeleteId(null);
      mutate();
    } catch (e: any) {
      setDeleteErr(e.message);
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" /> Usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${userList.length} usuário${userList.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-3.5 h-3.5" /> Novo usuário
        </button>
      </div>

      {deleteErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2 rounded-lg">
          {deleteErr}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : userList.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {userList.map((u, i) => (
            <div
              key={u.id}
              className={cn(
                "flex items-center px-5 py-3.5 gap-4",
                i < userList.length - 1 && "border-b border-border/60",
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                  {u.name}
                  {u.id === currentUserId && (
                    <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      você
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="w-2.5 h-2.5 flex-shrink-0" /> {u.email}
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full hidden sm:block flex-shrink-0",
                  roleBadgeClass(u.role),
                )}
              >
                {roleLabel(u.role)}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => openEdit(u)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {u.id !== currentUserId &&
                  (confirmDeleteId === u.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deleting}
                        className="text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded disabled:opacity-50"
                      >
                        {deleting ? "..." : "Excluir"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(u.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editing ? "Editar usuário" : "Novo usuário"}
              </h3>
              <button onClick={close}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@clinica.com"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {editing ? "Senha (deixe em branco para não alterar)" : "Senha *"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? "Nova senha (opcional)" : "Mínimo 6 caracteres"}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Perfil *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {err && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {err}
                </p>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border flex gap-2 justify-end">
              <button
                onClick={close}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
