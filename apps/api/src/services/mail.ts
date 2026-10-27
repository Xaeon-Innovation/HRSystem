export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Best-effort outbound email. Never throws, callers update delivery status from the result.
 * Prefer Resend when `RESEND_API_KEY` is set; otherwise `SMTP_WEBHOOK_URL` POST JSON.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  try {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
      const from =
        process.env.EMAIL_FROM?.trim() || "Polara <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[mail] Resend failed", res.status, detail.slice(0, 500));
        return { ok: false, reason: `resend_${res.status}` };
      }
      return { ok: true };
    }

    const webhook = process.env.SMTP_WEBHOOK_URL?.trim();
    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error(
          "[mail] SMTP webhook failed",
          res.status,
          detail.slice(0, 500),
        );
        return { ok: false, reason: `webhook_${res.status}` };
      }
      return { ok: true };
    }

    console.info("[mail] not configured; skipped", {
      to: input.to,
      subject: input.subject,
    });
    return { ok: false, reason: "not_configured" };
  } catch (err) {
    console.error("[mail] send failed", err);
    return { ok: false, reason: "exception" };
  }
}
