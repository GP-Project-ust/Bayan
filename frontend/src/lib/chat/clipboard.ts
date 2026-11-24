/**
 * Clipboard helper shared by the answer, SQL block and session drawer.
 * Falls back to a hidden textarea when the async Clipboard API is unavailable
 * (non-secure contexts and older WebViews).
 */
export async function copyText(text: string): Promise<boolean> {
  const value = typeof text === "string" ? text : "";
  if (!value) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    if (typeof document === "undefined") return false;
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
