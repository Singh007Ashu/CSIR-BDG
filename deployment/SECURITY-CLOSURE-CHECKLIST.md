# Security closure checklist

This checklist separates source-level work from evidence that must come from the CSIR staging or production environment. A local pass is not production approval.

## Source and test-environment work

- `security-api-register.csv` is generated from route files with `node scripts/generate-security-api-register.mjs`. It records route/method pairs and static auth-helper hints. A reviewer must fill ownership rules and test evidence; helper-name detection is not proof of authorization.
- For every non-public route/method, verify unauthenticated rejection, then test each permitted and denied role. For object routes, create Lab A and Lab B synthetic records and try read, update, delete, export, attachment download, and nested-resource access across tenants. Treat `405` as unsupported method, not authorization evidence.
- The current source scan found no direct `dangerouslySetInnerHTML`, `innerHTML` assignment, `insertAdjacentHTML`, `document.write`, or Prisma raw-query API occurrences under `app/` and `lib/`. Its three navigation matches were logout to fixed paths, login to a path checked against protocol-relative/control-character input, and stored notification navigation through `safeInternalPath`. Repeat the scan after code changes and manually inspect alternate DOM/SQL sinks; this result is a static source check, not proof of no XSS/SQLi.
- Keep automated source review for unsafe DOM sinks and raw SQL in release review. Exercise input points with safe synthetic SQLi and context-specific XSS payloads on staging, then record route, role, payload class, status, and observed result.
- Lab activation is a two-person process where policy requires it: an administrator verifies the person and submitted email using a contact from an existing CSIR directory/record, records a reference, and only then activates the account. The API requires both attestations and logs them. This is a manual verified-channel control; it does not send an email confirmation link.

## CSIR host and edge checks

- Keep `HOSTNAME=127.0.0.1` and `CSIR_REQUIRE_LOOPBACK_BIND=1` in the protected Node-service environment file and nginx upstream at `127.0.0.1:3000`. Startup rejects a non-loopback Node bind when this deployment guard is enabled. On the host, run `sudo ss -ltnp` and confirm the Node listener is bound only to `127.0.0.1:3000` (or an approved loopback address), never `0.0.0.0:3000` or `[::]:3000`. From another host, confirm TCP/3000 is unreachable.
- Run `sudo nginx -t`, reload nginx, and check unknown `Host` values are dropped. Confirm the proxy replaces `X-Forwarded-For` with the actual client address; do not append or trust a client-supplied chain. Test the public auth paths from two source IPs and confirm rate-limit behavior.
- Configure a WAF/API gateway policy for distributed credential-stuffing detection, per-IP/per-endpoint limits, bot challenge and alerting. Do not use a low hard global request cap that blocks all labs when one attacker generates traffic. Review thresholds against legitimate shared institutional egress IPs.
- With the real certificate and public DNS, verify HTTP redirect, TLS 1.2/1.3, HSTS, CSP, and `Secure; HttpOnly; SameSite=Lax` cookies. Record the date, hostname and captured headers.
- Check web-root contents and permissions directly. Confirm backups, database files, `.env`, uploads and private documents are outside the served tree; request the blocked paths through the public proxy and verify denial.

## Real service rehearsals

- **MySQL:** follow `CSIR-IT-HANDOVER.txt` against an empty dedicated MySQL 8 rehearsal database and a consistent protected SQLite snapshot. Run schema validation/push only against the empty rehearsal DB, migration preflight/import, count and checksum reconciliation, application regression, and a restore into a second empty database. Do not point rehearsal commands at production.
- **ClamAV:** install `clamd` and signature updates on the target host. Confirm signatures are current, scanner limits exceed the application's file-size cap, and the daemon is reachable only on loopback/private network. Verify EICAR is rejected, a known clean file is accepted, and a stopped/unreachable scanner fails closed. Record daemon and signature versions.
- **Backups:** run a restore drill from an approved encrypted backup. Record recovery time and reconcile database, uploads and document references.

## Independent acceptance

- Security reviewer signs off the endpoint register after object-level tests and source-to-sink review.
- Accessibility specialist completes NVDA/JAWS/VoiceOver checks; representative users complete business UAT for each role.
- CSIR IT and service owner approve production monitoring, log retention, alerting, incident response, backup retention and rollback plan.

Do not mark an item complete without a dated test record from the environment named in that item's evidence.
