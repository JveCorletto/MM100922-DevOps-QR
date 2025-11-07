"use client";
import { QRCodeCanvas } from "qrcode.react";

export default function QRCodeDisplay({ url }: { url: string }) {
  return <QRCodeCanvas value={url} size={180} includeMargin />;
}
