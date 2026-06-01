/**
 * Cloudflare Pages Function — student .edu discount verification
 *
 * POST /api/student-verify  { name, email }
 *   → validates .edu domain
 *   → stores pending token in KV (24h TTL)
 *   → sends verification email via Resend
 *   → returns { ok: true }
 *
 * GET  /api/student-verify?token=xxx
 *   → looks up token in KV
 *   → redirects to Polar checkout with student discount pre-applied
 *
 * Required bindings (set in Cloudflare Pages dashboard):
 *   KV namespace: STUDENT_KV
 *   Secret: RESEND_API_KEY
 *   Secret: POLAR_STUDENT_CHECKOUT_URL (optional, falls back to constant)
 */

const POLAR_SOLO_URL   = 'https://buy.polar.sh/polar_cl_5NZPJFhqNpdQYwj1prcRP3KSoZs55tgF8483w0MMKGf';
const STUDENT_CODE     = 'ALREADYSTUDENT';
const TOKEN_TTL_S      = 60 * 60 * 24; // 24 hours
const FROM_EMAIL       = 'Already <already@wait-what.shop>';
const SITE_URL         = 'https://already.wait-what.shop';

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function isEduEmail(email) {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith('.edu');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function sendVerificationEmail(env, { name, email, token }) {
  const verifyUrl = `${SITE_URL}/api/student-verify?token=${token}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your student email — Already',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #0A0A0A;">
          <p style="font-size: 15px; font-weight: 600; margin: 0 0 8px;">Hi ${escapeHtml(name)},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #3A3A38; margin: 0 0 24px;">
            Click below to verify your student email and unlock 50% off Already.
            This link expires in 24 hours.
          </p>
          <a href="${verifyUrl}"
             style="display: inline-block; background: #0A0A0A; color: #FCFCFA; font-size: 13px;
                    font-weight: 500; padding: 12px 24px; text-decoration: none;">
            Verify &amp; get 50% off →
          </a>
          <p style="font-size: 12px; color: #A8A8A0; margin: 32px 0 0;">
            If you didn't request this, ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handlePost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const name  = (body.name  || '').trim();
  const email = (body.email || '').trim().toLowerCase();

  if (!name)  return json({ ok: false, error: 'Name is required.' }, 400);
  if (!email) return json({ ok: false, error: 'Email is required.' }, 400);
  if (!isEduEmail(email)) {
    return json({ ok: false, error: 'A .edu email address is required.' }, 400);
  }

  // Rate-limit: one pending token per email address
  const existingToken = await env.STUDENT_KV.get(`email:${email}`);
  if (existingToken) {
    // Already sent — just say ok (don't leak existence)
    return json({ ok: true });
  }

  const token = randomToken();
  const record = JSON.stringify({ name, email, createdAt: Date.now() });

  // Store token → record (used during verification)
  await env.STUDENT_KV.put(`token:${token}`, record, { expirationTtl: TOKEN_TTL_S });
  // Store email → token (for rate-limiting; same TTL)
  await env.STUDENT_KV.put(`email:${email}`, token, { expirationTtl: TOKEN_TTL_S });

  try {
    await sendVerificationEmail(env, { name, email, token });
  } catch (err) {
    console.error('Resend failed:', err.message);
    // Clean up KV so they can retry
    await env.STUDENT_KV.delete(`token:${token}`);
    await env.STUDENT_KV.delete(`email:${email}`);
    return json({ ok: false, error: 'Could not send email. Please try again.' }, 500);
  }

  return json({ ok: true });
}

async function handleGet(request, env) {
  const url   = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.redirect(`${SITE_URL}/student/?error=missing`, 302);
  }

  const record = await env.STUDENT_KV.get(`token:${token}`);
  if (!record) {
    return Response.redirect(`${SITE_URL}/student/?error=expired`, 302);
  }

  // Mark token as used (delete so it can't be reused)
  let data;
  try { data = JSON.parse(record); } catch { data = {}; }
  await env.STUDENT_KV.delete(`token:${token}`);
  // Keep email lock for 30 days so the same email can't get a new token immediately
  await env.STUDENT_KV.put(`used:${data.email}`, '1', { expirationTtl: 60 * 60 * 24 * 30 });

  const checkoutBase = env.POLAR_STUDENT_CHECKOUT_URL || POLAR_SOLO_URL;
  const checkoutUrl  = `${checkoutBase}?discount_code=${STUDENT_CODE}`;

  return Response.redirect(checkoutUrl, 302);
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': SITE_URL,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (method === 'POST') return handlePost(request, env);
  if (method === 'GET')  return handleGet(request, env);

  return json({ error: 'Method not allowed' }, 405);
}
