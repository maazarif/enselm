# Enselm — Quietness within.

GitHub mirror of the working 0.6 prototype. Configure GitHub Pages to deploy `main` → `/docs`. The landing page links to the separate owner-private app; Pages cannot run the relay backend. No credentials, personal vaults, or hosting project identity are included. Source snapshot: `ee647e76fd2b74c2b39299be2be88efff4786189`.

# Enselm — working edition 0.6

**Quietness within.** The default is private. The decision is yours.

Enselm is an account-free notebook with an optional encrypted local vault and deliberate encrypted messaging. Edition 0.6 adds a JavaScript relay backend with persistent Cloudflare D1 storage. Encryption and private identity keys remain in the browser. This is a prototype, not independently audited security software. Enselm is a working name; trademark clearance is incomplete.

## Start here

1. Tap **Enselm → Notes**. Arrival is still and empty.
2. In **Controls**, enable encrypted saving and export a backup. There is no passphrase reset.
3. In **Connections**, create a local identity. Exchange public invitation files and compare complete fingerprints through a trusted channel.
4. For server delivery, both people must use the same deployment. In **Controls → Encrypted delivery**, explicitly enable a mailbox. Each recipient separately allows the verified sender under **View identity**.
5. Prepare a message and review the exact recipient and content. Choose encrypted file download or server queueing, then explicitly consent. File download remains the default.
6. Choose **Check messages** to retrieve unopened encrypted messages. Retrieval does not decrypt them; opening still requires your consent. There are no background checks, notifications, or read receipts.

The hosted copy remains owner-private and may require host sign-in. It is suitable for testing separate identities in separate browser profiles under the owner, not yet for general multi-person access. Site access and cryptographic identity are separate. Do not share your vault, keys, or passphrase as an invitation.

## Run the complete app locally

Node 24+ and Python 3 are needed for these commands. Unzip the source pack and enter its `enselm` directory:

```bash
python3 scripts/package-source.py
npm run build
npm start
```

Open **http://127.0.0.1:8000**. The development server binds only to loopback. It serves the frontend and API together and persists relay data in `.local-data/relay.sqlite`. Use separate browser profiles at the same origin to test two identities. Restarting retains queued data. Local startup initializes the schema once; for future schema changes, apply versioned migrations before using existing data.

No runtime npm dependencies are required for the server or tests. To regenerate database migrations after changing `db/schema.ts`, run `npm ci` and `npm run db:generate`. Deployment builds embed the frontend assets inside the Worker. Do not double-click `index.html`. Hosting elsewhere requires HTTPS and a supported Worker/D1 deployment or an appropriate Node host; the loopback development server is not a hardened internet-facing production host.

For notebook/file-only use, serve `dist` as static files; online delivery will be unavailable.

## Tests and source

```bash
npm run check
npm test
```

- `dist/core.js`: Web Crypto, identity and encrypted file/vault validation.
- `dist/app.js`, `dist/relay.js`: consent flows and explicit signed relay requests.
- `backend/relay.mjs`: authentication, authorization, quotas and queue operations.
- `backend/CONTRACT.md`: API contract and limits.
- `db/schema.ts`, `drizzle/`: versioned hosted database schema.
- `backend/local-server.mjs`: local Node host; SQLite adapter for development/tests.
- `scripts/build-backend.mjs`: deployable Worker bundle.
- `docs/ENGINEERING.md`, `docs/VALIDATION.md`: threat model and verification limits.

The source download includes source, migrations, tests, setup instructions, and locally bundled Manrope with its license. It excludes credentials, deployment identity, private data, and local database files.

## Boundaries

- Plaintext notes, vault passphrases and private keys are not uploaded. The relay sees chosen names/public keys in requests, sender/recipient fingerprints, permissions, timings, sizes and encrypted envelopes. Hosting can log network metadata.
- The custom prototype encryption protocol does not provide forward secrecy, post-compromise security, sender anonymity or an independently audited protocol guarantee.
- Relay messages are eligible for retrieval for seven days. Expired records are removed during subsequent requests; there is no exact physical-deletion deadline or guarantee about provider backups.
- Queue limit: 30 messages and 8 MiB per recipient; each online encrypted envelope is limited to 512 KiB. Larger attachments can use file exchange. Limits are enforced by the server.
- If a response is lost, a message may already be queued. The app retains an encrypted local pending record for an explicit retry using the same message ID. Queueing is not confirmation of receipt or reading. Submitted messages cannot be recalled.
- Temporary sessions disappear on reload. Encrypted browser storage can be cleared. Keep separate encrypted backups and their passphrases. Use one active tab per vault; cross-tab conflict detection is best effort.
- If locking cannot save, the session remains unlocked for recovery and says so. An unlocked device, malicious extension or replaced app code can expose data.
- Browser/iPhone acceptance testing, accessibility verification, load testing, independent security review and public-launch abuse/operations work remain incomplete.
