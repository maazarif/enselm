# Validation — edition 0.6, October 22, 2026

## Current release

Syntax checks and **73 automated tests passed**: 22 crypto/core, 32 navigation/state, 6 signed relay client, 11 backend, and 2 Worker/deployment integration tests. No new third-party runtime dependency was added.

Backend tests use actual Web Crypto identities/signatures/encryption and a real SQLite database through a D1-compatible adapter. They cover recipient permission, unauthorized identity access, replay/stale requests, origin binding, revocation, disabling, idempotency after acknowledgment, expiry cleanup, tampering, rate/count/byte limits, oversized requests, and rejection of private fields. These tests do not reproduce all Cloudflare D1 runtime behavior.

Frontend tests cover no network on load/unlock/navigation, vault-required delivery, persist-before-ack, failed-save retention, cancellation before dispatch, ambiguous response retention, safe retry preserving newer drafts, retry-window limits, and block/grant ordering. They use a minimal stub DOM, not a browser.

The built Worker was served through the local Node host over real loopback HTTP. A signed encrypted message survived stopping and restarting the server, was fetched by the intended identity, decrypted with explicit consent, and acknowledged. The generated hosted SQL migration was checked against local schema table columns and named indexes.

A separate security-focused agent reviewed the final backend and client changes and accepted them for an owner-private prototype after cancellation and draft-preservation issues were fixed. This is AI-assisted source review, not an independent professional security audit.

## Outstanding acceptance work

Rendered UI/browser/iPhone testing remains incomplete. The supported browser path was previously blocked by browser policy; no workaround was used. Keyboard/screen-reader acceptance, real Safari Files behavior, public-load/abuse testing, independent protocol review, and operational retention/recovery drills remain outstanding. A deployed URL does not establish production-grade security.

The current hosted audience remains owner-only. Cross-person delivery requires both people to access the same relay deployment; it is not enabled by silently sharing this site.

## Historical edition 0.5 validation

## Executed

`npm run check`: JavaScript syntax validation for the shared core and app.

`npm test`: 45 automated tests passed (22 crypto/core tests and 23 UI-state/navigation tests) using Node 24.19.0 and real Web Crypto operations. Core tests generate three independent identities rather than mocking cryptography. Navigation tests use a minimal DOM stub in Node, not a browser.

Navigation checks verify that arrival, Options, and privacy disclosures create no state; Notes initializes once; returning to Stillness retains the session; and a stored vault remains locked until a task is selected.

Additional navigation tests cover invalid routes, deliberate public-shelf opt-in/out, and keyboard focus transfer. CSS brace balance, HTML IDs, and local asset references were checked statically; this does not verify browser layout.

Core coverage includes:

- Private initial defaults and no implicit identity/audience.
- Public-only invitations, fingerprint mismatch, private-key rejection.
- Real encrypted message round trip; wrong-recipient failure.
- Incoming consent, verification, and blocking.
- Every outgoing consent field, changed payload/recipient, and countdown enforcement.
- Signature rejection after ciphertext or sender-name tampering.
- Replay rejection and photo round trip.
- Rejection of active-content attachment formats.
- Encrypted vault round trip including identity private keys.
- Wrong passphrase, modified ciphertext, fresh IVs, bounded KDF input, malformed state.

## Code review fixes during implementation

- Serialized encrypted saves to avoid stale asynchronous writes.
- Prevented duplicate export while encryption is running.
- Rechecked review transaction and recipient permissions before file download, so cancellation during encryption fails closed.
- Backup export works independently of browser storage quota.
- Captured unfinished notes before idle/manual vault lock.
- No raw HTML interpolation of user notes, messages, names, or fingerprints.
- Imported image content is re-encoded to remove original metadata and reject active formats.

## Verification limits

Supported browser-control tooling was unavailable in this environment. No preview server or substitute browser automation was used. Therefore visual rendering, full UI interaction, accessibility, and real iPhone Files/share behavior have **not** been verified. Automated core tests are not a security audit or end-user acceptance test.

## Device acceptance checklist still required

1. At 390px and 1440px widths, verify no clipped content, readable typography, and reachable controls.
2. Start without an account; save/edit/search/delete a note, including special characters and a photo.
3. Enable a vault, reload, reject a wrong password, unlock, and resume an unfinished note after lock.
4. Export and restore a backup in a separate browser; verify identity and old messages remain readable.
5. Exchange invitations and a message between two browser profiles; confirm the sender never reports delivery.
6. Cancel each consent stage and during encryption; confirm no download occurs.
7. Import, decline, block, and accept messages; verify plaintext remains closed until acceptance.
8. Enable/disable the public shelf; confirm external sites do not load until explicit navigation.
9. Test iOS Safari file downloads/imports, private browsing storage limits, storage-full errors, and background timer behavior.
10. Verify keyboard focus, dialog labels, screen-reader announcements, and reduced-motion behavior.

Use synthetic data until these checks and a security review are completed.

Edition 0.4 adds stub-DOM tests for browser Back draft preservation, deletion of recovered drafts, Connections import discoverability, and persistent storage failure feedback. Browser Back is simulated via hashchange, not exercised in a real browser. The original core cryptography is unchanged.


## Edition 0.5 release checks

Syntax checks and all 45 tests passed on October 17, 2026. New deterministic deferred-promise tests exercise late unlock and vault creation after erase, backup snapshot capture, lock interaction freeze and persistence ordering, late backup cancellation, failed-lock recovery, queued saves during erase, observed cross-tab conflicts, stale unlock rejection, cancelled incoming file reads, delayed photo removal, and preference changes. These UI-state tests use stubbed asynchronous crypto/DOM operations; the separate 22 core tests exercise actual Web Crypto.

Design review accepted the static opening, locally hosted Manrope, restrained action-triggered motion, and reduced-motion treatment. A separate security-focused agent accepted the final source diff for the owner-private prototype after cancellation races were fixed. This is AI-assisted review, not professional independent security review. The shared crypto core is unchanged.

Source archive includes font bytes, license, provenance, application code, documentation, and all automated tests. Cross-tab conflict handling is best effort; one active tab is required. A failed save deliberately leaves the session unlocked for recovery and makes that status explicit.


## Edition 0.5.1 — October 21, 2026

Home entry renamed to Enselm with a route-aware accessible navigation label. Visual surfaces changed to open typography, transparent cards, and fine action rules. Consent, failure notices, keyboard focus and reduced-motion behavior remain explicit. Syntax checks and all 45 existing automated tests passed. Browser preview was attempted through the supported tool, but browser security policy blocked access; rendered visual and iPhone verification remain incomplete. No crypto or persistence changes.
