"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="action-button"
      type="button"
      onClick={() => {
        startTransition(() => {
          void (async () => {
            await fetch("/api/auth/logout", {
              method: "POST",
            });
            router.push("/login");
            router.refresh();
          })();
        });
      }}
      disabled={isPending}
    >
      {isPending ? "Signing out..." : "Logout"}
    </button>
  );
}
