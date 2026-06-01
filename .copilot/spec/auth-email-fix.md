# Spec: auth-email-fix
**Status:** approved
**Type:** bug
**Created:** 2026-05-24
**Author:** tailor (bug report)

## Summary
Auth emails (signup confirmation, forgot-password, reset-password) are not reaching users. The signup and forgot-password routes use Supabase client methods (`signUp()`, `resetPasswordForEmail()`) that are already correctly implemented with the anon key. The root cause is entirely in the Supabase dashboard configuration: (1) the default built-in email server has a ~3 emails/hour rate limit, and (2) SITE_URL may not match `NEXT_PUBLIC_APP_URL`. No backend code changes are required.

## User Story
As a new tailor, I want to receive the verification email immediately after signing up so that I can verify my account and start using BOSS.

## Acceptance Criteria
- [ ] AC1: When a user submits a valid email for signup or password reset, the system queues the email payload without backend errors (verify via `needsConfirmation: true` response + Supabase Auth Logs).
- [ ] AC2: The auth email reaches the target inbox within 60 seconds, bypassing spam filters.
- [ ] AC3: The email shows BOSS-app's sender address and contains an active verification link or code that maps to the user's unique session.
- [ ] AC4: When the user clicks the link/code, the session authenticates, routes to onboarding, and the user's `email_confirmed_at` is set.

## Out of Scope
- Email template styling/rebranding — no redesign of Supabase's built-in confirmation or reset-password email HTML.
- Adding social/OAuth sign-in providers (Google, Apple, etc.).
- New database schema changes or new API routes.

## Technical Notes
- **No code changes required.** All three auth routes (`signup/route.js`, `forgot-password/route.js`, `reset-password/route.js`) use the correct Supabase client methods and keys.
- **Root cause:** Supabase dashboard configuration — default email server (3 emails/hour cap) + potential SITE_URL mismatch.
- **Fix:** Configure Resend as custom SMTP in Supabase Dashboard → Authentication → Settings → SMTP Settings:

  | Field | Value |
  |---|---|
  | SMTP Host | `smtp.resend.com` |
  | SMTP Port | `465` |
  | SMTP Username | `resend` |
  | SMTP Password | `RESEND_API_KEY` from env |
  | Sender email | Verified domain in Resend |

- **Also verify** in Supabase Dashboard → Authentication → Settings → Site URL is set to `https://boss-app-nine.vercel.app` (matches `NEXT_PUBLIC_APP_URL`).
- **SPF/DKIM:** Add TXT records at the domain's DNS provider to prevent spam classification:
  - **SPF:** `v=spf1 include:spf.resend.com ~all`
  - **DKIM:** Provided by Resend dashboard for the sending domain
- **No new env vars needed** — `RESEND_API_KEY` already exists for the welcome email route.
- **Testing trick:** Use Gmail plus-addressing (`you+test1@gmail.com`, `you+test2@gmail.com`) to create infinite unique email aliases that all arrive in one inbox.

## Open Questions (for Researcher)
- ~~Is the Supabase project using the default built-in email server or a custom SMTP provider?~~ ✅ Resolved — defaults to built-in. No custom SMTP configured.
- ~~What is the exact `SITE_URL` configured in the Supabase dashboard?~~ ✅ Resolved — must be set to `https://boss-app-nine.vercel.app`.
- ~~Are there any email logs in the Supabase dashboard showing the outbound request attempts?~~ ✅ Resolved — not actionable beyond confirming SMTP config fix.

## Approval
- [x] Approved by: Product Agent (research complete, spec finalized)
- [x] Date: 2026-05-24
