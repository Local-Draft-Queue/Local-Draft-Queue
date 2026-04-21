"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { ConfirmModal } from "@/components/confirm-modal";
import type { WordPressSite } from "@/types/site";

interface SitesManagerProps {
  initialSites: WordPressSite[];
}

const INITIAL_FORM = {
  siteKey: "",
  label: "",
  baseUrl: "",
  username: "",
  applicationPassword: "",
  categoryId: "1",
  defaultTags: "",
};

export function SitesManager({ initialSites }: SitesManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingSiteKey, setEditingSiteKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sitePendingDelete, setSitePendingDelete] = useState<WordPressSite | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmOpen(true);
  }

  function handleConfirmSave() {
    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch(editingSiteKey ? `/api/sites/${editingSiteKey}` : "/api/sites", {
          method: editingSiteKey ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            categoryId: Number(form.categoryId),
            defaultTags: form.defaultTags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Unable to save site."));
          return;
        }

        setForm(INITIAL_FORM);
        setEditingSiteKey(null);
        setConfirmOpen(false);
        router.refresh();
      })();
    });
  }

  function handleEdit(site: WordPressSite) {
    setEditingSiteKey(site.siteKey);
    setForm({
      siteKey: site.siteKey,
      label: site.label,
      baseUrl: site.baseUrl,
      username: site.username,
      applicationPassword: "",
      categoryId: String(site.categoryId),
      defaultTags: site.defaultTags.join(", "),
    });
    setError("");
  }

  function handleCancelEdit() {
    setEditingSiteKey(null);
    setForm(INITIAL_FORM);
    setError("");
  }

  function handleDelete(siteKey: string) {
    startTransition(() => {
      void (async () => {
        setError("");
        const response = await fetch(`/api/sites/${siteKey}`, {
          method: "DELETE",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(String(payload?.error ?? "Unable to delete site."));
          return;
        }

        setSitePendingDelete(null);
        router.refresh();
      })();
    });
  }

  return (
    <>
      <div className="sites-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Site Vault</p>
              <h2>Save a WordPress site once</h2>
            </div>
          </div>

          <label>
            <span>Site Key</span>
            <input
              value={form.siteKey}
              onChange={(event) => updateField("siteKey", event.target.value)}
              placeholder="site-a"
              required
              disabled={Boolean(editingSiteKey) || isPending}
            />
          </label>

          <label>
            <span>Label</span>
            <input
              value={form.label}
              onChange={(event) => updateField("label", event.target.value)}
              placeholder="Main Site"
            />
          </label>

          <label>
            <span>Base URL</span>
            <input
              value={form.baseUrl}
              onChange={(event) => updateField("baseUrl", event.target.value)}
              placeholder="https://example.com"
              required
            />
          </label>

          <label>
            <span>WordPress Username</span>
            <input
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder="editor"
              required
            />
          </label>

          <label>
            <span>Application Password</span>
            <input
              type="password"
              value={form.applicationPassword}
              onChange={(event) => updateField("applicationPassword", event.target.value)}
              placeholder={editingSiteKey ? "Leave blank to keep current password" : "xxxx xxxx xxxx xxxx xxxx xxxx"}
              required={!editingSiteKey}
            />
          </label>

          <label>
            <span>Category ID</span>
            <input
              type="number"
              min="1"
              value={form.categoryId}
              onChange={(event) => updateField("categoryId", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Default Tags</span>
            <input
              value={form.defaultTags}
              onChange={(event) => updateField("defaultTags", event.target.value)}
              placeholder="automation, drafts"
            />
          </label>

          <div className="form-footer">
            <button className="action-button action-button-solid" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : editingSiteKey ? "Update Site" : "Save Site"}
            </button>
            {editingSiteKey ? (
              <button className="action-button" type="button" onClick={handleCancelEdit} disabled={isPending}>
                Cancel
              </button>
            ) : null}
            {error ? <p className="inline-error">{error}</p> : null}
          </div>
        </form>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Saved Sites</p>
              <h2>{initialSites.length} site{initialSites.length === 1 ? "" : "s"}</h2>
            </div>
          </div>

          {initialSites.length === 0 ? (
            <p className="muted">No saved WordPress sites yet.</p>
          ) : (
            <div className="site-list">
              {initialSites.map((site) => (
                <article key={site.siteKey} className="site-card">
                  <div>
                    <strong>{site.label}</strong>
                    <p className="muted">{site.siteKey}</p>
                  </div>
                  <p className="muted">{site.baseUrl}</p>
                  <p className="muted">
                    User: {site.username} · Category: {site.categoryId}
                  </p>
                  <p className="muted">
                    Tags: {site.defaultTags.length > 0 ? site.defaultTags.join(", ") : "None"}
                  </p>
                  <div className="site-card-actions">
                    <button
                      className="action-button"
                      type="button"
                      onClick={() => handleEdit(site)}
                      disabled={isPending}
                    >
                      Edit
                    </button>
                    <button
                      className="action-button"
                      type="button"
                      onClick={() => setSitePendingDelete(site)}
                      disabled={isPending}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={editingSiteKey ? "Update site?" : "Create site?"}
        description={
          editingSiteKey
            ? "This will overwrite the saved site configuration. Leaving the password blank keeps the existing password."
            : "This will save the WordPress site credentials to the local site vault."
        }
        confirmLabel={isPending ? "Saving..." : editingSiteKey ? "Update Site" : "Create Site"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      >
        <p><strong>Site key:</strong> {form.siteKey}</p>
        <p><strong>Label:</strong> {form.label || form.siteKey}</p>
        <p><strong>Base URL:</strong> {form.baseUrl}</p>
      </ConfirmModal>

      <ConfirmModal
        open={Boolean(sitePendingDelete)}
        title="Delete site?"
        description="This removes the saved WordPress site from the local vault. Existing tasks will keep their site key, but generation will fail if that site is missing."
        confirmLabel={isPending ? "Deleting..." : "Delete Site"}
        tone="danger"
        onCancel={() => setSitePendingDelete(null)}
        onConfirm={() => {
          if (sitePendingDelete) {
            handleDelete(sitePendingDelete.siteKey);
          }
        }}
      >
        <p><strong>Site:</strong> {sitePendingDelete?.label}</p>
        <p><strong>Key:</strong> {sitePendingDelete?.siteKey}</p>
      </ConfirmModal>
    </>
  );
}
