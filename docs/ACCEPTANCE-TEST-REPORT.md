# PulseWatch 1.5 acceptance report

This report summarizes completed verification through November 16, 2026. **The final independent Playwright desktop and mobile journeys passed; the final backend/frontend verification passed 151 tests.** These are separate test runs. PulseWatch remains an unauthenticated local demonstration, not a production-ready service.

PASS means executed successfully; FAIL means executed and failed; NOT TESTED means not executed; BLOCKED means a specific limitation prevented execution. Earlier failures below are retained as history and are superseded only where a later passing run is identified.

## Final verification

| Check | Result | Scope |
| --- | --- | --- |
| Vitest backend/frontend, November 16 | PASS: 151 tests in 16 files, zero failed or pending | 139 backend and 12 frontend; see [release verification](release-verification-2026-11-16/RELEASE-VERIFICATION.md) |
| Production build | PASS: 39 modules | Vite build |
| Production and full dependency audits | PASS: zero reported vulnerabilities | npm audit results at verification time; not a guarantee of future safety |
| Playwright desktop and 390x844 mobile | PASS: two aggregate journeys, zero skipped or failed | Independent Chromium contexts with disposable databases and controlled checker results; run before the final Vitest verification |
| Physical devices and other browser engines | NOT TESTED | Mobile was emulated |

The final Playwright run used normal clicks and passed monitor creation/editing for HTTP, DNS, SSL and TCP; validation; details and check history; failure threshold and recovery; incident drawer; refresh persistence; and three history pagination round trips. Each monitor type used the real API, worker and SQLite repository, with test-only injected outcomes. No external failures were induced. Certificate-history metadata was a controlled fixture. The intentionally invalid domain produced an expected HTTP 400 and corresponding console message; no unexpected failed requests or page errors were recorded in that journey.

On mobile, the final `.lower` grid and incident panel each measured 362px within a 390px viewport. Document scroll width, `innerWidth` and visual viewport width measured 390px. The history wrapper measured 352px with an intentional 620px scrollable table. Desktop drawer geometry matched the earlier 1440px measurements.

Sanitized final [Playwright results](release-verification-2026-11-16/playwright-results-sanitized.json), [desktop observations](release-verification-2026-11-16/playwright-desktop-observations-sanitized.json) and [mobile observations](release-verification-2026-11-16/playwright-mobile-observations-sanitized.json) retain scenario and geometry evidence without local database paths or ports.

## Curated browser screenshots

- [Desktop dashboard](acceptance-evidence/overview-grid/acceptance/journey.e2e.cjs-complete-isolated-UI-journey-desktop/dashboard.png)
- [Desktop certificate history](acceptance-evidence/overview-grid/acceptance/journey.e2e.cjs-complete-isolated-UI-journey-desktop/certificate-history-page2.png)
- [Mobile Overview panel](acceptance-evidence/overview-grid/acceptance/journey.e2e.cjs-complete-isolated-UI-journey-mobile/overview-panel.png)
- [Mobile drawer](acceptance-evidence/overview-grid/acceptance/journey.e2e.cjs-complete-isolated-UI-journey-mobile/drawer-readable.png)
- [Mobile pagination](acceptance-evidence/overview-grid/acceptance/journey.e2e.cjs-complete-isolated-UI-journey-mobile/pagination-repeated.png)
- [Mobile resolved incident](acceptance-evidence/overview-grid/acceptance/journey.e2e.cjs-complete-isolated-UI-journey-mobile/incident-resolved.png)

The [evidence inventory](release-verification-2026-11-16/EVIDENCE-INVENTORY.txt) lists the original artifacts and their proposed retention. Raw traces, historical failures and machine-specific result files are retained locally but excluded from the proposed checkpoint; the six screenshots above are proposed for Git.

## Historical results and corrections

- An earlier automated run passed 149 tests. After two certificate-summary tests were added, the suite passed 151; the November 16 release verification independently confirmed 151. Standalone runtime and TLS runner assertions are additional evidence, not part of either count.
- An initial acceptance run passed 11 and failed 8 assertions. Fixes addressed malformed HTTP URL and JSON handling, deletion with incident history, incompatible configuration, and the HTTP DNS/redirect deadline. Their regression tests subsequently passed.
- Computer Use was blocked by its browser URL verification restriction and produced no dashboard evidence. It was not bypassed. Later independent Playwright runs supplied the browser evidence described above.
- Earlier desktop/mobile Playwright runs failed because an incident drawer retained a stale snapshot, certificate summary followed the selected history page, and mobile layout used an incorrect viewport. Later fixes and passing browser tests verified those paths. Intermediate mobile runs still failed on drawer layout, Close interception and history pagination; the final passing run followed the scoped mobile drawer and Overview grid corrections.
- The first TLS runner attempt failed due to a fixture observation timing mistake; a corrected local fixture passed 12 grouped TLS/HTTPS assertions. Test-only trust was scoped to those clients and did not disable production certificate verification.

## Functional and security evidence

Automated tests exercised valid and invalid monitor configuration, edits, pause/resume, scheduling, overlap and concurrency guards, check persistence, three-failure incident creation, deduplication and recovery for all four types. Reopen, migration, integrity and foreign-key checks used disposable SQLite databases. Controlled local sockets exercised HTTP and TCP; local certificate fixtures exercised valid, expired, untrusted and hostname-mismatched TLS handshakes. These tests are evidence for the cases executed, not exhaustive network coverage.

The shared destination checks were tested against representative private, loopback, link-local, multicast, mapped/embedded IPv6 and special-purpose addresses, mixed DNS answers, redirects, rebinding and pinning. API tests covered request limits, rate limiting, CORS headers, validation and selected injection inputs. Address classification cannot account for all routing, translation or proxy configurations; operator egress controls remain important. CORS and rate limiting are not authentication.

## Remaining limitations and untested cases

- Incident drawer state is polled, so updates can take up to 15 seconds. Current certificate metadata is refreshed when details or a history page is requested, not continuously while the drawer is idle. The summary reflects the latest check; if it has no certificate metadata, it shows unavailable values.
- The mobile Close control measured approximately 16x33px in the exercised fixture. It passed the actual browser click but remains a small target.
- Real public-service availability, live resolver outages and recovery, packet-dropping TCP timeouts, all TLS chain/revocation variants, physical devices, other browser engines, keyboard accessibility, long-duration load, disk-full and power-loss recovery were NOT TESTED in this acceptance run.
- OS DNS work can outlive logical check deadlines; API HTTP create/edit resolution does not share the monitoring deadline. Some HTTP/DNS/SSL error classifications remain generic or text-dependent.
- DNS monitoring supports A records. SSL/TCP try the first validated address. A TCP handshake does not prove application health. HTTP checks do not validate response content.
- Dashboard list requests have fixed limits; check history itself is paginated. The application has no authentication and must remain local. No public deployment was performed.

## Data and repository protection

Tests used in-memory databases or newly created temporary databases. Real SQLite database, WAL and SHM hashes remained unchanged during the recorded verification. The checkpoint branch and annotated tag were preserved. No reset, clean, commit or push was performed. Full test commands, exact counts, audit results and hashes appear in the release verification report linked above.

## Release hardening follow-up — November 16, 2026

This follow-up supersedes the earlier 151-test and two-browser-pass counts only for the current unstaged working tree. The previous staged snapshot and historical evidence were retained.

- PASS: complete backend/frontend suite, 172 tests in 18 files. New tests cover version 5-to-6 migration and retained check history; delayed HTTP, DNS, SSL and TCP results after edits; pause/resume and deletion; stale success with an open incident; browser-origin guard; output path safety; and build fingerprint changes.
- PASS: fresh production build and both npm audits, zero reported vulnerabilities.
- PASS: full desktop and mobile Chromium Playwright journeys, two tests, using a fresh build, isolated browser contexts and disposable databases. The successful result JSON is under `../e2e-runs/` with a `run-hardening-verified` prefix; worker screenshots, traces and observations are in separate newly created directories under the same root.
- An earlier explicit-output run failed before browser tests because worker config reload saw the existing output directory. That failure is retained separately; the policy was corrected and the full journeys passed afterward.

Implementation: migration 6 adds `monitors.config_revision` without recreating tables. Repository edits and pause/resume increment it. The worker passes the revision it dispatched, and the transaction rejects stale results before writing checks, status or incidents. Existing historical data and existing incident state are preserved. Editing a target does not reset failures or resolve an existing incident; this is retained behavior and can carry a previous failure sequence into subsequent checks of the edited target.

State-changing API requests reject a disallowed/malformed Origin and browser Fetch Metadata marked cross-site, independently of CORS. Configured frontend origin and local same-origin requests are allowed. Missing Origin is accepted for command-line clients unless Fetch Metadata marks it cross-site. This is a browser-origin defense, not authentication: non-browser clients or older clients that omit both signals remain trusted, and the service must stay local.

E2E output is restricted to a direct `run-...` name within `docs/e2e-runs`; supplied paths and existing names/results are rejected. Every config evaluation chooses a unique new child so Playwright cannot clear a previous run directory. A global setup builds the frontend and hashes the resulting assets; the test harness refuses to serve absent or mismatched build proof. No historical evidence was overwritten. Production SSRF and TLS validation remain enabled.

The real database, WAL and SHM hashes match the previous baseline; checkpoint references and the previously staged 39-file index were unchanged. New source, tests, reports and evidence remain unstaged for review. No commit or push occurred. Cross-browser/physical-device coverage and the limitations already recorded above remain unchanged.

## Incident configuration transitions and source freshness — November 16, 2026

This follow-up supersedes the previous 172-test result and the previous statement that configuration edits retain failure counts. **PASS: 185 tests in 19 files**, production build, and both dependency audits (zero reported vulnerabilities). **PASS: two complete desktop/mobile Playwright journeys** with fresh isolated SQLite databases. The earlier E2E output-safety setup failure remains historical evidence; no earlier artifacts were overwritten.

Migration 7 adds nullable `incidents.closure_reason`; existing rows remain unchanged and readable. Actual changes to HTTP URL, DNS/SSL/TCP domain, TCP port, DNS record type where supported, timeout, interval or SSL warning threshold reset the consecutive-failure counter and mark the monitor pending. Monitor type is immutable through the current API, and DNS currently supports only A records. Name-only or unchanged edits do not reset failures. A check-relevant edit atomically closes an open incident with status RESOLVED and `closure_reason=configuration_changed`, without recovery details; its prior category, failure timestamps, checks and evidence remain intact. The list and drawer present this reason as CLOSED due to configuration change, never recovered. A normal successful recovery records `closure_reason=recovered`; legacy null reasons remain readable. New incident first-failure selection uses the new failure sequence rather than prior checks.

E2E global setup fingerprints frontend source (`client/src`, `public` when present, index, Vite configuration and package manifests) before the build, checks again after the build, and supplies the fingerprint as run metadata. The harness checks it again before startup, alongside the existing build-asset fingerprint. A deterministic test changes a disposable frontend source fixture after computing build proof and verifies that the actual E2E harness exits before startup. Source changes after a harness has already passed its startup check are not monitored continuously; environment-dependent build inputs outside the listed files are not fingerprinted.

[Fresh Vitest results](release-candidate-2026-11-16/tests-sanitized.json), [fresh build output](release-candidate-2026-11-16/build-output.txt), [production audit](release-candidate-2026-11-16/audit-production.json), [full audit](release-candidate-2026-11-16/audit-full.json), and [Playwright result](release-candidate-2026-11-16/playwright-results-sanitized.json). [Desktop observations](release-candidate-2026-11-16/playwright-desktop-observations-sanitized.json) and [mobile observations](release-candidate-2026-11-16/playwright-mobile-observations-sanitized.json) include the configuration-closure scenario. Curated [desktop](release-candidate-2026-11-16/desktop-configuration-closure.png) and [mobile](release-candidate-2026-11-16/mobile-configuration-closure.png) screenshots are retained; raw traces and local-path artifacts remain outside the proposed checkpoint.

Database migration tests used disposable databases and checked preserved incident/check records, SQLite integrity and foreign keys. The real database, WAL and SHM hashes and checkpoint branch/tag references remain unchanged. The original 39 staged files remain byte-for-byte unchanged; this follow-up is unstaged. No commit or push occurred. Chromium mobile emulation is not a physical-device or cross-browser test; remaining security and network limitations above still apply.


## Incident snapshot verification — 16 November 2026

Migration 8 adds nullable incident configuration snapshots. New incidents retain monitor type, target, TCP port and DNS record type; older incidents report unavailable configuration rather than the current target. Configuration-change closures remain distinct from recovery. The standalone drawer diagnostic now runs the same fresh-build proof and isolated harness.

- PASS: 191 automated tests across 20 files, including additive version-7 migration, persistence, integrity and foreign-key checks. The first sandboxed attempt had 41 failures caused by loopback EACCES; the complete rerun with loopback access passed. [Sanitized test results](release-snapshot-verification-2026-11-16/tests-sanitized.json).
- PASS: production Vite build (39 modules); production and full npm audits each reported zero vulnerabilities.
- PASS: complete isolated Playwright desktop and mobile journeys, 2 passed, 0 skipped. [Results](release-snapshot-verification-2026-11-16/playwright-results-sanitized.json), [desktop observations](release-snapshot-verification-2026-11-16/desktop-observations-sanitized.json), [mobile observations](release-snapshot-verification-2026-11-16/mobile-observations-sanitized.json), [desktop screenshot](release-snapshot-verification-2026-11-16/desktop-incident-resolved.png), [mobile screenshot](release-snapshot-verification-2026-11-16/mobile-incident-resolved.png). The expected invalid-input request produced one HTTP 400 console entry.
- PASS: standalone diagnostic in a separate disposable database: both 390px and 1440px Next-button centres hit the button; document widths matched viewport widths. [Mobile geometry](release-snapshot-verification-2026-11-16/drawer-390.json), [desktop geometry](release-snapshot-verification-2026-11-16/drawer-1440.json), [mobile screenshot](release-snapshot-verification-2026-11-16/drawer-390.png), [desktop screenshot](release-snapshot-verification-2026-11-16/drawer-1440.png).

The legacy standalone db:verify script was not run because it deletes its fixed database path; migration, reopen, foreign-key and integrity coverage used disposable databases in the test suite. Historical evidence is retained. These results do not establish public production readiness.
