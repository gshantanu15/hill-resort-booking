"use client";
import { useState } from "react";
export default function CopyReference({ reference }: { reference: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "selected">("idle");
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(reference);
      setStatus("copied");
    } catch {
      const node = document.getElementById("booking-reference");
      if (!node) return;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(node);
      selection?.removeAllRanges();
      selection?.addRange(range);
      setStatus("selected");
    }
    window.setTimeout(() => setStatus("idle"), 2400);
  }
  return (
    <button
      className="copy-reference"
      type="button"
      onClick={copy}
      aria-live="polite"
    >
      {status === "copied"
        ? "Reference copied"
        : status === "selected"
          ? "Reference selected. Press Ctrl/Cmd+C to copy."
          : "Copy reference"}
    </button>
  );
}
