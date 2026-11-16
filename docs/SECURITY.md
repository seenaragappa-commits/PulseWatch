# Security

## Threat model and protections

The principal risk is SSRF because users supply URLs. PulseWatch permits only uncredentialed HTTP/HTTPS URLs; rejects localhost, private, loopback, link-local, multicast, reserved, IPv4-mapped IPv6, and cloud metadata address space; resolves DNS before each request; and passes the resolved public address into the actual request lookup. TLS still receives the original hostname, so certificate validation remains enabled. Redirects are handled manually, capped at three, and each destination is revalidated.

The API uses Helmet, a restrictive localhost CORS origin, JSON request-size limit, rate limiting, Zod validation, SQL parameters, foreign keys, and centralized safe errors. It binds to `127.0.0.1` by default.

## Limitations and deployment

No network defense can guarantee protection against every hostile DNS/network environment. Keep this application local or behind authentication and a network egress policy. Do not expose its unauthenticated API publicly. For public deployment, add authentication, TLS termination, firewall egress restrictions, process supervision, backups, and a production CORS allowlist. Run dependency audits regularly; the current npm install reports advisories that should be reviewed before an internet-facing release.

## Audited limitations

PulseWatch pins each individual check to the DNS addresses it validated, including every redirect destination. This prevents ordinary DNS rebinding between validation and connection, but it is not a substitute for an egress firewall in a hostile network. The current rules reject common IPv4 private/reserved ranges, private/link-local/multicast/loopback IPv6, IPv4-mapped private IPv6, and documentation IPv6 ranges. Keep an egress deny policy for sensitive networks in any deployment.

The application is intentionally unauthenticated and therefore suitable only for trusted local demonstration. Test-only validator injection is limited to `NODE_ENV=test` plus an explicit test flag; production routing always uses the normal SSRF validator.
