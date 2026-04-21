"use client";

import type { ReactNode } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  children,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Confirm Action</p>
        <h2 id="confirm-modal-title">{title}</h2>
        <p className="muted">{description}</p>
        {children ? <div className="modal-body">{children}</div> : null}
        <div className="modal-actions">
          <button className="action-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`action-button ${tone === "danger" ? "action-button-danger" : "action-button-solid"}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
