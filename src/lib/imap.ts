import { ImapFlow } from 'imapflow';

/**
 * Connects to INBOX and returns a Set of lowercase FROM addresses
 * seen in the last `sinceDays` days. Used to detect lead replies
 * before sending follow-up sequences.
 */
export async function fetchRepliedEmails(sinceDays = 60): Promise<Set<string>> {
  const host = process.env.IMAP_HOST ?? 'mail.privateemail.com';
  const user = process.env.IMAP_USER ?? '';
  const pass = process.env.IMAP_PASS ?? '';

  if (!user || !pass) return new Set();

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const replied = new Set<string>();

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date();
      since.setDate(since.getDate() - sinceDays);
      for await (const msg of client.fetch({ since }, { envelope: true })) {
        const from = msg.envelope?.from?.[0]?.address;
        if (from) replied.add(from.toLowerCase());
      }
    } finally {
      lock.release();
    }
  } catch {
    // IMAP failure is non-fatal — sequences still process, just without reply detection
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }

  return replied;
}
