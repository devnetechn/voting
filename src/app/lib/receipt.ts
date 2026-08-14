import crypto from "crypto";

export type ReceiptRow = {
  position: string;
  candidateName: string;
  partyList: string;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function computeReceiptHash(
  schoolId: string,
  votes: Record<string, string>
): string {
  const sortedEntries = Object.entries(votes).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const payload = `${schoolId}|${sortedEntries
    .map(([pos, id]) => `${pos}:${id}`)
    .join("|")}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function buildReceiptHtml(opts: {
  studentName: string;
  schoolId: string;
  submittedAt: string;
  rows: ReceiptRow[];
  refCode: string;
}): string {
  const { studentName, schoolId, submittedAt, rows, refCode } = opts;

  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.position)}</td><td>${escapeHtml(
          r.candidateName
        )}</td><td>${escapeHtml(r.partyList)}</td></tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Vote Receipt - ${escapeHtml(schoolId || studentName)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
  .receipt { max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; }
  h1 { font-size: 18px; text-align: center; color: #0F4C75; margin: 0 0 4px; }
  .sub { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 20px; }
  .info { font-size: 13px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; }
  th { color: #475569; font-weight: 600; }
  .ref { margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; word-break: break-all; }
  .ref b { display: block; color: #0F4C75; margin-bottom: 4px; }
  .footer { margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <div class="receipt">
    <h1>Stratford International School &mdash; E-Boto</h1>
    <div class="sub">Official Vote Receipt</div>
    <div class="info"><b>Student:</b> ${escapeHtml(studentName)}</div>
    <div class="info"><b>School ID:</b> ${escapeHtml(schoolId || "N/A")}</div>
    <div class="info"><b>Submitted:</b> ${escapeHtml(submittedAt)}</div>
    <table>
      <thead><tr><th>Position</th><th>Candidate</th><th>Party</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="ref">
      <b>Verification Reference Code</b>
      ${escapeHtml(refCode)}
    </div>
    <div class="footer">This receipt is proof of your submitted votes. Keep this file as your record.</div>
  </div>
</body>
</html>`;
}
