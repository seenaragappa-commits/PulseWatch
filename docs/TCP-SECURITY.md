# Stage 4: destination policy and TCP monitoring

The shared policy applies to HTTP/HTTPS, DNS A records, SSL and TCP. It uses
ipaddr.js 2.2.0 for parsing and range classification, after Node net.isIP rejects
noncanonical IP forms. Scoped IPv6 addresses are rejected. Only the library's
unicast category is permitted; IPv6 must additionally be in 2000::/3.
No mapped address is converted to IPv4 before classification.

## Exact exclusions

IPv4 (the union of library special ranges):
0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8,
169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.0.2.0/24,
192.31.196.0/24, 192.52.193.0/24, 192.88.99.0/24, 192.168.0.0/16,
192.175.48.0/24, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24,
224.0.0.0/4, 240.0.0.0/4 (including 255.255.255.255).

IPv6: everything outside 2000::/3 is rejected. Within 2000::/3 the excluded
union is 2001::/23, 2001:db8::/32, 2002::/16, 2620:4f:8000::/48,
3ffe::/16 and 3fff::/20. This intentionally excludes some globally reachable
special-purpose addresses too. These rules include all IPv4-mapped IPv6,
64:ff9b::/96 and 64:ff9b:1::/48 translation, discard 100::/64, Teredo,
6to4, local, multicast and reserved space.

Every returned DNS address is validated; any prohibited answer rejects the
entire set. HTTP lookup pinning and per-redirect revalidation are preserved.
SSL connects to a validated IP with its original SNI and hostname verification;
TLS certificate validation remains enabled.

## TCP configuration and lifecycle

TCP_ALLOWED_PORTS is an operator-controlled comma-separated list, default 443.
Invalid configuration fails startup. The API exposes this list through
GET /api/tcp-policy. No API permits changing it. Port validation runs on create,
edit and every check, so removing a port also blocks existing monitors.
Only fully qualified domain names are accepted. IP literals and known local/
special suffixes are rejected. A domain resolving privately fails its check.

Create with monitorType TCP, domain, tcpPort, name, intervalSeconds and timeoutMs.
Migration 5 adds nullable monitors.tcp_port with a 1–65535 CHECK constraint.
Existing data is preserved. The compatibility URL is tcp://domain:port.

The existing worker dispatches TCP checks with shared concurrency and overlap
guards. A single deadline covers DNS and connect. TCP connects to the first
validated IP, sends no payload, and destroys its socket on success, error,
timeout or AbortSignal cancellation. Shutdown drains active work under this
deadline. Results use existing checks, classified incidents and recovery.

## Evidence and limitations

Deterministic tests exercise prohibited addresses, mixed answers, pinned HTTP
lookup and same-host redirect rebinding, SSL rejection before connecting, TCP
pinning, refusal, timeout, cancellation, late DNS answers, approved ports, API
editing, worker limits, migration, persistence and incident recovery.
TLS regression tests retain strict verification and original SNI assertions.
No external hosts are used to simulate failures.

IP classification cannot prove a destination is reachable or trustworthy. The
policy is a pinned snapshot, requiring review as assignments change. Custom
network-specific NAT64 prefixes inside public space, routing overrides, and
public proxies require operator egress controls; this is not exhaustive SSRF
protection. System dns.lookup cannot be cancelled: deadlines prevent late
connections, but underlying OS resolver work may outlive a check.
TCP tests use isolated transports; browser interaction and live public TCP
connectivity have not been verified in this stage. Only the first validated
address is tried, and a successful handshake says nothing about application
health. No authentication was added; operation remains local only.

Dependency audit: production audit reports zero vulnerabilities. Full audit
reports three affected development packages (two critical, one moderate):
vitest, tinypool and @vitest/mocker. Major test-tool upgrades were not applied.
See npm audit for GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8,
GHSA-5gmw-xhrv-c9v3 and GHSA-85c8-ppgw-ccpr.
