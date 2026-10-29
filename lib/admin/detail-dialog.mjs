export function cronJobDetail(job) {
  return {
    name: job.name,
    kind: job.kind,
    enabled: job.enabled,
    status: job.status,
    lastRun: job.lastRun,
    nextRun: job.nextRun,
    summary: job.summary,
    referenceType: job.referenceType,
    reference: job.reference,
    detailsWithheld: Boolean(job.details),
  };
}

export function activateDialog({ dialog, opener, body, onClose }) {
  const previousOverflow = body.style.overflow;
  body.style.overflow = "hidden";
  dialog.querySelector("[data-dialog-close]")?.focus();
  const handleKeyDown = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll("[data-dialog-focusable]")];
    const active = dialog.ownerDocument?.activeElement ?? document.activeElement;
    if (!focusable.length) {
      event.preventDefault();
      dialog.querySelector("[data-dialog-close]")?.focus();
    } else if (event.shiftKey && active === focusable[0]) {
      event.preventDefault();
      focusable.at(-1).focus();
    } else if (!event.shiftKey && active === focusable.at(-1)) {
      event.preventDefault();
      focusable[0].focus();
    }
  };
  dialog.addEventListener("keydown", handleKeyDown);
  return () => {
    dialog.removeEventListener("keydown", handleKeyDown);
    body.style.overflow = previousOverflow;
    opener?.focus();
  };
}
