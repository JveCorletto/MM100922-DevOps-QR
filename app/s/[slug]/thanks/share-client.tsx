"use client";

import { useState } from "react";

export function ShareButtons({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof location !== "undefined" ? `${location.origin}/s/${slug}` : `/s/${slug}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Encuesta", text: "Responde esta encuesta", url });
      } else {
        onCopy();
      }
    } catch {}
  };

  return (
    <div className="flex items-center" style={{ gap: ".5rem", justifyContent: "center", flexWrap: "wrap" }}>
      <button className="btn outline" onClick={onCopy}>{copied ? "¡Copiado!" : "Copiar enlace"}</button>
      <button className="btn" onClick={onShare}>Compartir</button>
    </div>
  );
}