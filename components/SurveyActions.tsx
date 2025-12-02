"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CopyLink({ slug }: { slug: string }) {
  const [ok, setOk] = useState(false);

  return (
    <button className="btn outline"
      onClick={async () => {
        const url =
          typeof location !== "undefined"
            ? `${location.origin}/s/${slug}`
            : `/s/${slug}`;
        try {
          await navigator.clipboard.writeText(url);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          console.error("No se pudo copiar");
        }
      }}
      title="Copiar enlace"
    >
      {ok ? "¡Copiado!" : "Copiar enlace"}
    </button>
  );
}

export function Actions({
  id,
  status: initial,
  slug: initialSlug,
}: {
  id: string;
  status: "draft" | "published" | "closed";
  slug: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState({
    status: initial,
    slug: initialSlug,
  });

  const call = (action: "publish" | "close" | "reopen") => {
    start(async () => {
      const res = await fetch(`/api/surveys/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) return; // podrías mostrar toast aquí

      const j = await res.json();
      // 1) actualiza UI inmediata (optimista)
      setState({ status: j.status, slug: j.slug ?? state.slug });
      // 2) revalida la página Server para que cambie badge, botones y slug arriba
      router.refresh();
    });
  };

  if (state.status === "draft") {
    return (
      <button className="btn primary" onClick={() => call("publish")} disabled={pending}>
        {pending ? "Publicando…" : "Publicar"}
      </button>
    );
  }

  if (state.status === "published") {
    return (
      <button
        className="btn danger"
        onClick={() => call("close")}
        disabled={pending}
      >
        {pending ? "Cerrando…" : "Cerrar"}
      </button>
    );
  }

  // closed
  return (
    <button className="btn primary" onClick={() => call("reopen")} disabled={pending}>
      {pending ? "Reabriendo…" : "Reabrir"}
    </button>
  );
}