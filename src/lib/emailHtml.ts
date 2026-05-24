/**
 * Converts a plain-text email body to a clean HTML email with an optional
 * 1×1 tracking pixel appended. The plain text is preserved for storage;
 * this is only called at send time.
 */
export function textToHtml(plainText: string, trackingPixelUrl?: string): string {
  const escaped = plainText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Make URLs clickable
  const linked = escaped.replace(
    /(https?:\/\/[^\s<>"&]+)/g,
    '<a href="$1" style="color:#2563eb;text-decoration:none;">$1</a>',
  );

  // Convert paragraphs (double newline → <p>, single newline → <br>)
  const body = linked
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 1.1em;line-height:1.65;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  const pixel = trackingPixelUrl
    ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:24px 16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111827;">
<div style="max-width:600px;margin:0 auto;">
${body}
</div>
${pixel}
</body></html>`;
}
