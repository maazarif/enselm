# Engineering and threat model

## Architecture

Browser HTML/CSS/JavaScript and a JavaScript Worker relay, no third-party runtime dependencies. `core.js` contains validation and Web Crypto operations. `app.js` owns rendering, session state, encrypted local storage, and file exchange. Edition 0.6 adds same-origin signed relay requests backed by persistent D1; private notebook/vault contents remain local.

The deployed review site is owner-private. Hosting access control is independent from the app's account-free design. The host receives standard HTTP page/asset requests and may log access metadata.

The HTML CSP permits same-origin connections for the relay and disallows remote scripts/fonts, forms, objects, and remote images. It permits local scripts/styles and local/data/blob images. External reading links are deliberate navigations, not embedded fetches. CSP cannot protect against malicious same-origin app updates, browser compromise, or extensions.

## Data model

The session state has version, optional identity, notes, contacts, messages, replay IDs, pending requests, preferences, and a private draft. Unsaved note edits are captured as `editorDraft` when the vault locks and can be resumed after unlocking.

- Identity: chosen name, SHA-256 fingerprint, RSA public/private JWKs, ECDSA public/private JWKs.
- Contact: fingerprint, chosen name, public keys, locally verified flag, locally blocked flag.
- Note: random ID, title, body, normalized optional photo, updated timestamp.
- Message record: ID, direction, chosen contact name, timestamp, body, photo, and local intention for prepared files.
- Pending request: signed encrypted envelope. Plaintext is not opened on import.
- Vault: versioned PBKDF2/AES-GCM envelope, kept under one localStorage key.

Prototype limits: 1,000 notes, 500 contacts, 1,000 message records, 30 pending requests, 30,000 characters per body, 2 MB input photo, 8 MB serialized file/vault. Browser storage quota may be smaller. Save failures are reported; backup export does not require a successful browser-storage write.

The relay uses D1 tables and versioned Drizzle migrations. It needs no application passwords, shared API keys or cloud file bucket. The host may require sign-in independently.

## File formats and cryptography

### Invitation (`.pfinvite`)

`type`, version, chosen name, fingerprint, public RSA and ECDSA JWKs. Fingerprint is SHA-256 over a deterministic JSON representation of the public keys. All 256 bits are displayed in groups for manual comparison. The name is unverified display information. Private-key fields in invitations are rejected.

### Message (`.pfmessage`)

1. Validate verified, unblocked recipient and all consent fields against the exact payload.
2. Generate a fresh AES-256-GCM key and random 96-bit nonce.
3. Encrypt normalized text/photo JSON. Authenticate version, message ID, sender fingerprint, recipient fingerprint, and timestamp as AAD.
4. Wrap the AES key with the recipient's RSA-OAEP-3072 public key using SHA-256.
5. Sign a deterministic envelope representation with the sender's ECDSA P-256 key using SHA-256.
6. Request a file download only if the current review transaction remains active and consent is still valid.

Import checks recipient, format, signature, and replay IDs. It does not decrypt. Acceptance additionally requires a verified, unblocked sender and explicit user action before unwrapping/decrypting.

This is a custom prototype protocol built from standard primitives, not an audited messaging protocol. There is no forward secrecy, post-compromise security, hidden metadata, sender anonymity, ratchet, receipt guarantee, or server-enforced expiry.

### Vault (`.pfvault`)

PBKDF2-SHA-256, 600,000 iterations, random 128-bit salt, AES-256-GCM, fresh random 96-bit IV per save, version-bound AAD. Passphrases must have at least 12 characters. Length alone does not guarantee entropy; a unique strong phrase is recommended. KDF parameters are bounded to reject file-driven excessive derivation work.

Keys and state live in memory while unlocked. Writes are serialized to prevent out-of-order saves. Lock flushes encrypted state then clears app-held references and the UI. JavaScript garbage collection means guaranteed memory zeroization is not possible. Five-minute idle checking runs on a timer; browser background throttling can delay it.

Encrypted backups include private identity keys; protect both the backup and its passphrase. Restoring can restore a previously used identity, so key compromise cannot be undone by restoring.

## Threat analysis

| Threat | Current protection | Remaining limit |
|---|---|---|
| Accidental broadcast | No publishing path, explicit recipient/review/export | User may deliver exported files through another app |
| Wrong recipient | Key-bound encryption; exact-recipient consent | User may verify or choose the wrong person |
| Modified file | Signature and AEAD validation | Compromised sender keys can sign malicious content |
| Name impersonation | Full fingerprint comparison | User must compare through a trusted channel |
| Vault theft while locked | Passphrase-derived encryption | Weak passphrases allow offline guessing |
| Stolen message file | Recipient-only encrypted content | Visible metadata; later private-key compromise |
| Replay | Locally retained accepted IDs | Other installations/restored backups may not know a replay |
| Harassing requests | No automatic inbox; local blocking; explicit import/open | New identities and external delivery cannot be globally blocked |
| Script injection | Escaped user text; restricted image MIME; CSP | No independent penetration review |
| Photo metadata | Canvas re-encoding removes source EXIF/container metadata | Visible image details can still identify someone |
| Device/browser compromise | No complete protection | Unlocked plaintext and keys are accessible |
| Storage eviction | Encrypted backup/restore | User must make and retain backups |
| Server/host compromise | Encrypted relay; at-rest encrypted local vault | Replaced app code can read data after user unlocks |

## Production engineering backlog

### Required before a private alpha with sensitive data

- Browser/device QA: Safari iOS, Safari macOS, Chromium, Firefox, keyboard and screen reader.
- Independent crypto/protocol review; prefer a maintained audited protocol/library over extending this custom envelope for chat.
- Strict restored-state schema, deeper fuzzing, large-file/resource exhaustion tests, concurrency and storage-quota tests.
- Migration/versioning policy, authenticated software delivery, dependency/update provenance.
- Decide recovery versus no-recovery deliberately; no silent escrow.

### Required for live communication

- Mutually accepted contact capabilities; identity verification and explicit key-change warnings.
- Durable opaque-ciphertext mailbox, bounded retention, rate limits, abuse handling, idempotent delivery IDs.
- Robust offline queues, retry/backoff, duplicate handling, transparent delivery states.
- Minimize notification metadata and default notifications off; no receipts without separate consent.
- Multi-device key agreement and revocation; full key lifecycle, forward secrecy, backup semantics.
- Authentication to the service can be possession-of-device keys, but no-auth transport must not be confused with no-identity/no-access-control engineering.
- Explicit metadata inventory, log minimization, deletion/retention policy, operational incident plan.

### Not implemented

Real-time push infrastructure, native mobile clients, device sync, contact QR scanning, public social feeds, recommendation algorithms, public profiles, AI moderation, subscriptions, payments, and production monitoring.

## Deployment and rollback

The build embeds assets and relay code into `dist/server/index.js`. Hosted D1 migrations accompany the Worker. Site source is synchronized to the configured Git repository and publication is versioned. Roll back by deploying a previously saved Site version; evaluate local vault-format compatibility before doing so. Version 0.3 reads only version 1 vault/envelope formats. Never log vault passwords or private keys.

## Enselm rename compatibility

Edition 0.3 changes presentation and download filenames only. Keep the private-first-vault-v1 localStorage key and all existing protocol type identifiers. Do not migrate or erase local data on a branding change. Encrypted backups downloaded under the old name continue to import.

## Edition 0.5 lifecycle and interface changes

Session generations invalidate pending work across lock, erase, and restore; operation generations also cancel work after navigation or dismissed decisions. Serialized save jobs check their session before encryption and before writing. Lock captures editor text/photo state, invalidates older work, freezes interaction, and clears app state only after persistence succeeds. Save failure leaves the session unlocked so the user can retry or export a backup. This is not ciphertext-only recovery or guaranteed memory zeroization.

Expected-storage comparisons and storage events detect observed changes from other tabs and stop further writes. Use one active tab: localStorage check/write is not an atomic transaction, so this does not guarantee simultaneous-writer exclusion. Encrypted backup remains available after conflict.

Manrope is bundled locally with its license and provenance. No third-party font request is introduced. Dialog entrance and interaction-color transitions respect reduced motion; urgent protection dialogs do not animate. The quiet home remains static.


## Edition 0.6 relay and deployment

The backend is JavaScript running on Cloudflare Workers, with D1 persistence. ASP.NET Core was considered but is not supported by the current host and has not been implemented. The local development host uses Node 24 and SQLite; it is loopback-only. Deployments preserve existing owner-only audience. A wider pilot needs an explicit audience change.

Every POST request is signed by the existing device identity using ECDSA P-256/SHA-256. The canonical signed message includes version, protocol domain, exact origin audience, timestamp, nonce, action and payload. Public invitations are fingerprint-validated; private fields are rejected. Timestamp validity is five minutes; consumed nonces are retained ten minutes. Per-identity and global nonce limits bound stored authentication records. These protections do not replace edge-level abuse defenses before public launch.

A recipient must explicitly enable its mailbox and allow a sender. SQL conditional inserts atomically recheck both mailbox states, grants, message-count/byte limits and sender budget. Revoke atomically removes the grant and queued ciphertext from that sender. Disable removes the recipient mailbox/grants and incoming queued ciphertext. Other recipients' data and downloaded copies are unaffected.

Only signed encrypted envelopes are queued. The backend validates envelope signatures and identity bindings; it has no decryption key. Mailboxes are addressed by fingerprints; there is no searchable user directory. The service observes relationship and timing metadata and the provider may log request metadata. No application request-body logging is implemented.

The client explicitly chooses file export or relay submission, defaults to file, and persists a pending encrypted record before network dispatch. Cancellation before dispatch stops it; after dispatch the outcome may be unknown. Explicit retry uses the identical envelope ID during a bounded retry window. Server idempotency tombstones do not reveal acknowledgment state and expire with the original queue record. Queue responses never mean read or received.

Manual retrieval validates envelopes, retains them unopened, and waits for encrypted local persistence before acknowledging server ciphertext. Loading, unlocking and ordinary navigation do not poll the relay. No notifications or receipts are added.

Limits: 1,000 mailboxes, 100 grants per mailbox, 120 signed API requests/minute/identity, 100 queued sends/day/sender, 30 pending messages and 8 MiB/recipient, 512 KiB/envelope. Seven-day retrieval expiration is enforced in SQL; physical cleanup is request-triggered. Provider backup retention is outside application deletion guarantees.

Before public release: independent protocol and implementation review; replace or formally review the custom envelope; real Safari/iPhone/browser acceptance; rate-limit/abuse defense against identity churn; operational logging/retention inventory without content; backup/restore and incident procedures; migration/rollback drills and realistic load tests.
