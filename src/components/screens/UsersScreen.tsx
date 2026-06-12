"use client";
// Admin — gestion des utilisateurs.
import React from "react";
import { useRouter } from "next/navigation";
import { K, Btn, Pill, Icons } from "@/components/ui";

type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  accessLaptopReports: boolean;
  accessCasierReports: boolean;
  accessReception: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  STAFF_MANAGER: "Gestionnaire",
  OPERATOR: "Opérateur",
};

const accessRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 12,
  border: `2px solid ${K.lineStrong}`,
  padding: "0 14px",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: K.display,
  color: K.ink,
  outline: "none",
  background: K.surfaceCool,
};

export default function UsersScreen({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [modal, setModal] = React.useState<
    | null
    | { mode: "create" }
    | { mode: "edit"; user: User }
    | { mode: "delete"; user: User }
  >(null);
  const [err, setErr] = React.useState("");

  const toggleActive = async (u: User) => {
    setErr("");
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error || "Erreur");
      return;
    }
    router.refresh();
  };

  return (
    <div
      style={{
        height: "100%",
        background: K.bgApp,
        color: K.ink,
        animation: "screenIn 0.35s ease both",
        fontFamily: K.body,
        padding: 40,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 11,
                fontWeight: 800,
                color: K.violet,
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              ● RemiseCMR · Administration
            </div>
            <div
              style={{
                fontFamily: K.display,
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: -1,
                marginTop: 4,
              }}
            >
              Gestion des utilisateurs
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              kind="ghostDark"
              size="md"
              icon={Icons.back({ size: 20, stroke: "#fff" })}
              onClick={() => router.push("/admin")}
            >
              Retour
            </Btn>
            <Btn
              kind="cta"
              size="md"
              icon={Icons.sparkle({ size: 18, stroke: "#fff", strokeWidth: 2 })}
              onClick={() => {
                setErr("");
                setModal({ mode: "create" });
              }}
            >
              Nouvel utilisateur
            </Btn>
          </div>
        </div>

        {err && (
          <div
            style={{
              background: K.red,
              color: "#fff",
              borderRadius: 14,
              padding: "12px 18px",
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            color: K.ink,
            borderRadius: 24,
            padding: 8,
            boxShadow: K.shadowCard,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: K.display,
            }}
          >
            <thead>
              <tr>
                {["Courriel", "Nom", "Rôle", "Actif", "Créé", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: K.ink3,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        borderBottom: `2px solid ${K.line}`,
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: K.mono, fontSize: 13 }}>
                      {u.email}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{u.fullName}</td>
                  <td style={tdStyle}>
                    <Pill
                      tone={
                        u.role === "SUPER_ADMIN"
                          ? "primary"
                          : u.role === "STAFF_MANAGER"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {ROLE_LABELS[u.role] || u.role}
                    </Pill>
                  </td>
                  <td style={tdStyle}>
                    {u.active ? (
                      <Pill tone="success">Actif</Pill>
                    ) : (
                      <Pill tone="danger">Inactif</Pill>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: K.ink3 }}>
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <ActionBtn onClick={() => setModal({ mode: "edit", user: u })}>
                        Modifier
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => toggleActive(u)}
                        disabled={u.id === currentUserId}
                      >
                        {u.active ? "Désactiver" : "Activer"}
                      </ActionBtn>
                      <ActionBtn
                        tone="danger"
                        onClick={() => {
                          setErr("");
                          setModal({ mode: "delete", user: u });
                        }}
                        disabled={u.id === currentUserId}
                      >
                        Supprimer
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: K.ink3,
                      padding: 32,
                    }}
                  >
                    Aucun utilisateur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.mode === "create" && (
        <UserForm
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
      {modal?.mode === "edit" && (
        <UserForm
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
      {modal?.mode === "delete" && (
        <DeleteConfirm
          user={modal.user}
          onClose={() => setModal(null)}
          onDeleted={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: `1px solid ${K.line}`,
  fontSize: 14,
  color: K.ink,
};

function ActionBtn({
  children,
  onClick,
  tone,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "danger";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: 999,
        padding: "7px 12px",
        fontFamily: K.display,
        fontWeight: 800,
        fontSize: 10.5,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        background: tone === "danger" ? K.pinkSoft : K.surfaceCool,
        color: tone === "danger" ? "#B2245A" : K.violetDeep,
      }}
    >
      {children}
    </button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "rgba(8,0,31,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: K.body,
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: K.display,
        fontSize: 11,
        fontWeight: 800,
        color: K.ink3,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [email, setEmail] = React.useState(user?.email || "");
  const [fullName, setFullName] = React.useState(user?.fullName || "");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState(user?.role || "OPERATOR");
  const [active, setActive] = React.useState(user?.active ?? true);
  const [accLaptop, setAccLaptop] = React.useState(
    user?.accessLaptopReports ?? false,
  );
  const [accCasier, setAccCasier] = React.useState(
    user?.accessCasierReports ?? true,
  );
  const [accReception, setAccReception] = React.useState(
    user?.accessReception ?? false,
  );
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = isEdit
        ? await fetch(`/api/admin/users/${user!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName,
              role,
              active,
              accessLaptopReports: accLaptop,
              accessCasierReports: accCasier,
              accessReception: accReception,
              ...(password ? { password } : {}),
            }),
          })
        : await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              fullName,
              password,
              role,
              active,
              accessLaptopReports: accLaptop,
              accessCasierReports: accCasier,
              accessReception: accReception,
            }),
          });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Erreur");
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Overlay>
      <div
        style={{
          width: 460,
          maxWidth: "100%",
          background: "#fff",
          color: K.ink,
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 30px 80px rgba(15,0,60,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "90%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            fontFamily: K.display,
            fontSize: 24,
            fontWeight: 800,
            color: K.ink,
            letterSpacing: -0.6,
          }}
        >
          {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
        </div>

        <div>
          <Label>Identifiant</Label>
          <input
            type="text"
            value={email}
            disabled={isEdit}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...inputStyle, opacity: isEdit ? 0.55 : 1 }}
            placeholder="ex. agarcia"
          />
          {!isEdit && (
            <div
              style={{
                fontSize: 11.5,
                color: K.ink3,
                fontWeight: 600,
                marginTop: 5,
              }}
            >
              Tapez seulement le nom court — @collegemont-royal.qc.ca est
              ajouté automatiquement.
            </div>
          )}
        </div>

        <div>
          <Label>Nom complet</Label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <Label>
            Mot de passe{" "}
            {isEdit ? "(laisser vide pour ne pas changer)" : "(min. 8 caractères)"}
          </Label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>

        <div>
          <Label>Rôle</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={inputStyle as React.CSSProperties}
          >
            <option value="OPERATOR">Opérateur</option>
            <option value="STAFF_MANAGER">Gestionnaire</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
          Compte actif
        </label>

        {role === "STAFF_MANAGER" && (
          <div
            style={{
              border: `2px solid ${K.line}`,
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Label>Accès aux rapports</Label>
            <label style={accessRowStyle}>
              <input
                type="checkbox"
                checked={accCasier}
                onChange={(e) => setAccCasier(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
              Rapports Casiers
            </label>
            <label style={accessRowStyle}>
              <input
                type="checkbox"
                checked={accLaptop}
                onChange={(e) => setAccLaptop(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
              Rapports Portables
            </label>
          </div>
        )}
        {role === "SUPER_ADMIN" && (
          <div style={{ fontSize: 12, color: K.ink3, fontWeight: 600 }}>
            Le Super Admin voit tous les rapports (Portables et Casiers) et a
            accès à la réception.
          </div>
        )}

        {role !== "SUPER_ADMIN" && (
          <div
            style={{
              border: `2px solid ${K.line}`,
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            <Label>Poste réception</Label>
            <label style={accessRowStyle}>
              <input
                type="checkbox"
                checked={accReception}
                onChange={(e) => setAccReception(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
              🔔 Accès au poste réception
            </label>
          </div>
        )}

        {err && (
          <div
            style={{
              background: K.pinkSoft,
              color: "#B2245A",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn kind="ghost" size="md" onClick={onClose} style={{ flex: 1 }}>
            Annuler
          </Btn>
          <Btn
            kind="primary"
            size="md"
            onClick={submit}
            disabled={busy}
            style={{ flex: 2 }}
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

function DeleteConfirm({
  user,
  onClose,
  onDeleted,
}: {
  user: User;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const match = typed.trim().toLowerCase() === user.email.toLowerCase();

  const del = async () => {
    if (!match) return;
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j?.error || "Erreur");
      setBusy(false);
      return;
    }
    onDeleted();
  };

  return (
    <Overlay>
      <div
        style={{
          width: 440,
          maxWidth: "100%",
          background: "#fff",
          color: K.ink,
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 30px 80px rgba(15,0,60,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            fontFamily: K.display,
            fontSize: 22,
            fontWeight: 800,
            color: "#B2245A",
          }}
        >
          Supprimer l&apos;utilisateur
        </div>
        <div style={{ fontSize: 14, color: K.ink2, fontWeight: 600 }}>
          Cette action est irréversible. Pour confirmer, tapez le courriel{" "}
          <strong style={{ fontFamily: K.mono }}>{user.email}</strong>.
        </div>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          style={inputStyle}
          placeholder={user.email}
          autoFocus
        />
        {err && (
          <div
            style={{
              background: K.pinkSoft,
              color: "#B2245A",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn kind="ghost" size="md" onClick={onClose} style={{ flex: 1 }}>
            Annuler
          </Btn>
          <Btn
            kind="cta"
            size="md"
            onClick={del}
            disabled={!match || busy}
            style={{ flex: 1 }}
          >
            {busy ? "Suppression…" : "Supprimer"}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}
