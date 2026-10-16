"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/types";
import { Alert, Avatar } from "./ui";

async function send(path: string, method: string, body?: BodyInit) {
  const response = await fetch(path, {
    method,
    body,
    headers:
      body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
  });
  const result = await response.json();
  if (!response.ok)
    throw new ProfileRequestError(
      response.status,
      result.error || "Não foi possível salvar a alteração.",
    );
  return result;
}

class ProfileRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function splitPhones(value: string) {
  return value
    .split(/[,;\n]/)
    .map((phone) => phone.trim())
    .filter(Boolean);
}

export function ProfileForms({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [personalEmail, setPersonalEmail] = useState(
    profile.personalEmail ?? "",
  );
  const [personalPhones, setPersonalPhones] = useState(
    (profile.personalPhones ?? []).join(", "),
  );
  const [institutionalPhones, setInstitutionalPhones] = useState(
    (profile.institutionalPhones ?? []).join(", "),
  );
  const [address, setAddress] = useState(
    profile.personalData?.address === "Não informado"
      ? ""
      : (profile.personalData?.address ?? ""),
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photo, setPhoto] = useState(Boolean(profile.photoId));
  const [photoVersion, setPhotoVersion] = useState(0);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setFeedback(null);
    try {
      await action();
      setFeedback({ tone: "success", text: "Alteração salva com sucesso." });
      router.refresh();
    } catch (cause) {
      if (cause instanceof ProfileRequestError && cause.status === 403)
        router.replace("/403");
      else if (cause instanceof ProfileRequestError && cause.status === 401)
        router.replace("/login?expired=1");
      else
        setFeedback({
          tone: "error",
          text:
            cause instanceof Error ? cause.message : "Não foi possível salvar.",
        });
    } finally {
      setBusy("");
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profile.personalEmail && !personalEmail.trim()) {
      setFeedback({
        tone: "error",
        text: "A API ainda não permite remover o e-mail pessoal existente.",
      });
      return;
    }
    run("profile", async () => {
      await send(
        "/api/profile",
        "PATCH",
        JSON.stringify({
          name,
          email,
          personalEmail,
          personalPhones: splitPhones(personalPhones),
          institutionalPhones: splitPhones(institutionalPhones),
        }),
      );
    });
  }

  function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run("address", async () => {
      await send("/api/profile/address", "PATCH", JSON.stringify({ address }));
    });
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem(
      "photo",
    ) as HTMLInputElement;
    if (!input.files?.[0]) return;
    await run("photo", async () => {
      const form = new FormData();
      form.set("photo", input.files![0]);
      await send("/api/profile/photo", "POST", form);
      setPhoto(true);
      setPhotoVersion((value) => value + 1);
      input.value = "";
    });
  }

  async function removePhoto() {
    await run("photo", async () => {
      await send("/api/profile/photo", "DELETE");
      setPhoto(false);
    });
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      setFeedback({
        tone: "error",
        text: "A nova senha deve ter ao menos 8 caracteres e coincidir com a confirmação.",
      });
      return;
    }
    setBusy("password");
    setFeedback(null);
    try {
      await send(
        "/api/profile/password",
        "PATCH",
        JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      );
      router.replace("/login?password=1");
      router.refresh();
    } catch (cause) {
      if (cause instanceof ProfileRequestError && cause.status === 403)
        router.replace("/403");
      else if (cause instanceof ProfileRequestError && cause.status === 401)
        router.replace("/login?expired=1");
      else
        setFeedback({
          tone: "error",
          text:
            cause instanceof Error
              ? cause.message
              : "Não foi possível alterar a senha.",
        });
      setBusy("");
    }
  }

  return (
    <div className="profile-grid">
      <aside className="card card-pad profile-summary">
        <div className="profile-summary-head">
          <span key={photoVersion}>
            <Avatar name={profile.name} photo={photo} large />
          </span>
          <span>
            <strong>{profile.name}</strong>
            <small>{profile.email}</small>
          </span>
        </div>
        <div className="profile-detail">
          <small>Cargo</small>
          <strong>{profile.role.name}</strong>
        </div>
        {profile.personalData?.cpf && (
          <div className="profile-detail">
            <small>CPF</small>
            <strong className="mono">{profile.personalData.cpf}</strong>
          </div>
        )}
        {profile.personalData?.fullName &&
          profile.personalData.fullName !== profile.name && (
            <div className="profile-detail">
              <small>Nome de registro</small>
              <strong>{profile.personalData.fullName}</strong>
            </div>
          )}
      </aside>
      <div className="profile-forms">
        {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}
        <form className="card card-pad profile-form" onSubmit={saveProfile}>
          <h2>Dados de contato</h2>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="profile-name">Nome</label>
              <input
                className="input"
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-email">E-mail da conta</label>
              <input
                className="input"
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="personal-email">E-mail pessoal</label>
              <input
                className="input"
                id="personal-email"
                type="email"
                value={personalEmail}
                onChange={(event) => setPersonalEmail(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="personal-phones">Telefones pessoais</label>
              <input
                className="input"
                id="personal-phones"
                value={personalPhones}
                onChange={(event) => setPersonalPhones(event.target.value)}
                placeholder="Separe por vírgula"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="institutional-phones">
              Telefones institucionais
            </label>
            <input
              className="input"
              id="institutional-phones"
              value={institutionalPhones}
              onChange={(event) => setInstitutionalPhones(event.target.value)}
              placeholder="Separe por vírgula"
            />
          </div>
          <div className="form-actions">
            <button className="button button-primary" disabled={Boolean(busy)}>
              {busy === "profile" ? "Salvando..." : "Salvar dados"}
            </button>
          </div>
        </form>
        {profile.personalData && (
          <form className="card card-pad profile-form" onSubmit={saveAddress}>
            <h2>Endereço</h2>
            <div className="field">
              <label htmlFor="address">Endereço completo</label>
              <input
                className="input"
                id="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                minLength={3}
                required
              />
            </div>
            <div className="form-actions">
              <button
                className="button button-primary"
                disabled={Boolean(busy)}
              >
                {busy === "address" ? "Salvando..." : "Salvar endereço"}
              </button>
            </div>
          </form>
        )}
        <form className="card card-pad profile-form" onSubmit={uploadPhoto}>
          <h2>Foto do perfil</h2>
          <div className="field">
            <label htmlFor="photo">Escolher imagem</label>
            <input
              className="input"
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <span className="field-note">JPEG, PNG ou WebP. Até 3 MB.</span>
          </div>
          <div className="photo-actions">
            <button className="button button-primary" disabled={Boolean(busy)}>
              {busy === "photo" ? "Enviando..." : "Enviar foto"}
            </button>
            {photo && (
              <button
                type="button"
                className="button button-secondary"
                onClick={removePhoto}
                disabled={Boolean(busy)}
              >
                Remover foto
              </button>
            )}
          </div>
        </form>
        <form className="card card-pad profile-form" onSubmit={savePassword}>
          <h2>Trocar senha</h2>
          <div className="field">
            <label htmlFor="current-password">Senha atual</label>
            <input
              className="input"
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="new-password">Nova senha</label>
              <input
                className="input"
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />              
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirmar nova senha</label>
              <input
                className="input"
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="button button-primary" disabled={Boolean(busy)}>
              {busy === "password" ? "Alterando..." : "Alterar senha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
