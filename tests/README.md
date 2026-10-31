# Tests

Browser tests use Playwright. Run each against a production build (`next build && next start -p 3100`).

| Suite | What it covers | Build against |
| --- | --- | --- |
| `e2e/signup-flow.e2e.js` | Every signup path step by step, resume, duplicate email, stuck accounts, upgrade by card and transfer, WCAG checks | Stand-in database: `node tests/mock-supabase/server.js`, then build with `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` |
| `e2e/paid-flow.e2e.js` | Pay-before-entry mode: card, closed pop-up, transfer to pending page, home-service plan prices | Same, plus `NEXT_PUBLIC_FREE_SIGNUP=false` |
| `e2e/landing.e2e.js` | 18 landing pages, signup form edge cases, calculator, routing | Real project URL (Supabase calls are intercepted in the browser) |
| `e2e/core.e2e.js` | Homepage, login, password reset, job posting entry | Real project URL (intercepted) |
| `db/security.sql` | Database permissions after the security migration | A Supabase branch, never production |

`npm i -D @axe-core/playwright` enables the accessibility checks.
