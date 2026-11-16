# Stage 4.1 validation report

Baseline: afc3f48540e3d43b4cdee11e2c6dffb5c3c3e74c on feature/tcp-monitoring,
initially clean. No production data or application source was changed.

## Verification evidence

Baseline: 101 tests passed. After upgrading Vitest: 101 tests and build passed.
Final: 107 tests across 13 files passed; production build passed.
npm run db:verify passed. This script checks a separate verification database,
not the production database. Migration tests additionally check preserved rows,
SQLite integrity_check and foreign_key_check in temporary databases.
Both npm audit and npm audit --omit=dev report zero vulnerabilities.

| Capability | HTTP/HTTPS | DNS | SSL | TCP |
| --- | --- | --- | --- | --- |
| API creation, invalid inputs, name editing | PASS | PASS | PASS | PASS |
| Worker scheduling and suppression until due | PASS | PASS | PASS | PASS |
| Worker success/failure, status, history | PASS | PASS | PASS | PASS |
| Reopen database and resume worker | PASS | PASS | PASS | PASS |
| Three failures, deduplication, fourth failure, recovery | PASS | PASS | PASS | PASS |
| Same-monitor overlap prevention | PASS | PASS | PASS | PASS |
| Checker timeout handling | PASS (request phase) | PASS | PASS | PASS |
| Live remote network verification | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

The new lifecycle matrix injects checker results and tests the real API,
repository, scheduler tick and SQLite. This is not proof of a real remote
protocol exchange. Existing checker tests separately simulate protocol outcomes.
Restart tests reopen SQLite and reconstruct the worker; they do not terminate
and restart a full running OS process.

A new test performs a real TCP handshake against a loopback server on an
ephemeral port. The test-only connector asserts the approved pinned public
destination then redirects transport to that server. Production policy remains
unchanged and still rejects loopback. No application payload is sent.

## Shared security evidence

Passing tests cover private IPv4/IPv6, loopback, link-local, metadata addresses,
special-purpose ranges, mapped/embedded IPv6, mixed answers, malformed/scoped
addresses, HTTP pinning, redirect revalidation and same-host DNS rebinding.
TCP tests cover prohibited ports/domains, pinned addresses, timeout, cancellation,
socket destruction, late DNS resolution and shared concurrency.
SSL tests assert strict chain validation, public pinned host and original SNI.
The new test invokes the actual Node hostname verifier with a mismatched SAN
and confirms a safe failure. Real trusted/untrusted TLS chain handshakes against
controlled certificate fixtures remain NOT TESTED.

## Dependency investigation and fix

Original installed versions: vitest 3.2.7, @vitest/mocker 3.2.7, tinypool 1.1.1.

| Advisory | Package / affected range | Severity | Patched release |
| --- | --- | --- | --- |
| GHSA-5gmw-xhrv-c9v3 | tinypool <=2.1.0 | Critical | 2.1.1 |
| GHSA-85c8-ppgw-ccpr | tinypool <2.1.2 | Critical | 2.1.2 |
| GHSA-82fw-gwwq-j7x9 | vitest / mocker >=2.1.0 <4.1.11 | Moderate | 4.1.11 |
| GHSA-qxg6-89mg-rqv8 | mocker >=2.1.0-beta.7 <4.1.12 | Moderate | 4.1.12 |

Vitest's aggregate critical rating included its tinypool dependency; it was
not an additional independent critical advisory.
Tinypool is used by the old test runner. Its execution gadgets require another
prototype-pollution primitive and attacker-controlled module/options. No route
from monitor input into those test-runner options was identified; absence of
such a route is not a general proof against supply-chain exploitation.

The mocker vulnerabilities require the public mockerPlugin/interceptorPlugin
development-server configuration. This repository configures React and
Tailwind, with Node-mode vitest run. Those public mocker plugins and browser
mode are not configured; their unauthenticated handlers are not part of the
observed workflow. None of these packages is a production dependency.

Fix: reviewed and pinned Vitest 4.1.12 (a major upgrade). Its declared Node and
Vite requirements match Node 26.3.0 and Vite 7.3.8 here. It brings mocker 4.1.12
and removes tinypool. No overrides, forced fixes or application changes.
The complete tests and production build passed immediately after the change.

Sources:
- https://github.com/advisories/GHSA-5gmw-xhrv-c9v3
- https://github.com/advisories/GHSA-85c8-ppgw-ccpr
- https://github.com/advisories/GHSA-82fw-gwwq-j7x9
- https://github.com/advisories/GHSA-qxg6-89mg-rqv8

## Browser validation: NOT TESTED

No installed Playwright/Cypress framework or callable browser automation tool
was found. React server-render tests are not interactive browser evidence.
No new browser dependency was installed.

Manual checklist:
1. Run npm run dev from the project directory. Open http://127.0.0.1:5173.
   Keep DevTools Console and Network open; confirm no errors and successful
   /api/monitors, /api/stats, /api/incidents responses.
2. Using an operator-owned public endpoint, add HTTP/HTTPS (full URL), DNS
   (domain), SSL (domain, warning days), TCP (domain, approved port 443).
   Confirm each appears, wait at least its interval, and inspect its status.
3. For each type edit its name; pause it and verify history stops increasing;
   resume and confirm another check. Open the row and verify history/timestamps.
4. Attempt invalid domain/IP inputs and TCP port tampering through DevTools;
   expect 400 responses and no monitor creation.
5. On an operator-controlled public service only, stop the relevant service or
   inject a controlled failure using the automated test suite. After three
   failed checks inspect a single OPEN incident and its explanation; allow a
   fourth failure and confirm the same incident's count increases. Restore the
   service and confirm RESOLVED with a recovery time.
   Do not use third-party websites to provoke failures. Localhost targets
   remain blocked in the real application. If no controlled public target is
   available, mark interactive incident/recovery checks NOT TESTED.
6. Restart the backend; verify monitors/history survive. Check desktop and
   390px viewport layouts, empty/loading/error states and drawer controls.

## Remaining limitations and demonstration assessment

- HTTP DNS resolution has no application deadline; HTTP timeout tests cover
  requests, not a stalled resolver. Each redirect starts a new timeout.
- OS DNS work may outlive DNS/SSL/TCP logical deadlines. Shutdown drains work;
  an unresolved HTTP lookup can therefore delay shutdown.
- SSL certificate summary uses the first check on the selected history page,
  so browsing older pages can show older certificate metadata.
- Open incident drawers show the selected snapshot until reopened.
- HTTP/DNS/SSL failure classification still depends partly on safe error text;
  HTTP DNS failures caught by the worker and some TLS/refused errors lose their
  precise category. Successful SSL warnings retain existing recovery behavior.
- The shared address policy is conservative, not exhaustive protection against
  custom routing/translation; see TCP-SECURITY.md.
- No authentication; bind locally. No production-readiness claim.

The automated demonstration path is ready. A fully rehearsed interview browser
demonstration is conditional on completing the manual checklist. Do not present
the untested browser flows or live TLS certificate-chain behavior as verified.
