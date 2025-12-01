// utils/fingerprint.ts (client)
async function sha256Hex(str: string) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

function canvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 200;
    canvas.height = 50;
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = "#069";
    ctx.fillText("fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("fingerprint", 4, 17);
    const data = canvas.toDataURL();
    return data;
  } catch (e) { return ""; }
}

export async function getFingerprint(): Promise<string> {
  try {
    const nav = navigator as any;
    const parts = [
      navigator.userAgent || "",
      navigator.language || "",
      navigator.platform || "",
      (navigator.vendor || ""),
      String(screen?.width || 0) + "x" + String(screen?.height || 0),
      String(screen?.colorDepth || 0),
      String(navigator.hardwareConcurrency || 0),
      String((navigator as any).deviceMemory || 0),
      Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || "",
      canvasHash(),
    ];
    const raw = parts.join("||");
    return await sha256Hex(raw);
  } catch (e) {
    return String(Math.random()).slice(2);
  }
}