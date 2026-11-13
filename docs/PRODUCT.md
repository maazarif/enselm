# Product definition

## Product thesis

A private personal space where communicating is a separately chosen act. Saving, reading, drafting, and liking must never silently become publication, presence, or notification. The product promises predictable boundaries, not absolute safety or universal anonymity.

**Working name:** Enselm.

**Brand line:** Quietness within.

**Privacy promise:** The default is private. The decision is yours.

**Design:** restrained monochrome, straight sans-serif type, explicit verbs, ample spacing, visible destinations, no ambiguous social-action icons.

## Stillness-first entry (edition 0.3)

The entry screen is static near-black with a single visible Options control. No greeting, encouragement, memories, onboarding, or content appears automatically. Opening Options creates no session or identity. Choosing a task opens its controls; a stored vault stays locked until explicitly unlocked. Notes use neutral empty states. Consent questions remain only after a requested share. Returning to Quiet space does not erase data or lock an already unlocked vault; manual and idle locking remain available. Privacy disclosures remain reachable without creating a session.

## Initial audience

People who want fewer social obligations and precise control over availability. This includes people who dislike public posting, fear accidental exposure, or prefer occasional intentional communication. Do not require an “antisocial” identity or suggest a clinical diagnosis.

## Primary jobs

1. Keep a thought or photo without creating an audience.
2. Share a specific item with one known person after deliberate review.
3. Decide whether to receive or open someone else's content.
4. Understand where data lives and leave with an encrypted copy.

## Competitive learning

The naming screen found real adjacent products. Privacy, quiet interfaces, optional identity information, and local journals are already established ideas. Novelty and demand remain unproven.

Relevant public product descriptions reviewed during this conversation:

- Cord — Private Messaging: https://apps.apple.com/us/app/cord-private-messaging/id6756208297
- Enso — The Quiet Network: https://ensosocial.app/
- Quiet private messaging: https://tryquiet.org/
- Vellum private journal: https://play.google.com/store/apps/details?id=cc.vellum.app

These are marketing/listing observations, not hands-on audits. The hypothesis to test is whether understandable consent and prevention of unintended exposure produce value beyond existing privacy tools. Do not claim that competitors lack consent controls without testing them.

## Non-negotiable defaults

| Boundary | Product behavior |
|---|---|
| No automatic sharing | Save always means private save. |
| No implied audience | Recipient starts blank; one verified identity per file. |
| Specific consent | Review exact content and recipient, answer intention, acknowledge copying. |
| No silent receiving | Imports remain encrypted until accepted. |
| No implicit discovery | No phone book, searchable identity, follower graph, or recommendation engine. |
| No public content by default | Public shelf absent until explicitly enabled. |
| Honest reversibility | Delete and block describe only the control they actually provide. |
| No account wall inside app | Local notebook works without identity creation. |
| No coercive retention | No streaks, urgency badges, read receipts, autoplay, or daily engagement targets. |

## First-version decisions

**Notebook first.** The app must be useful with zero contacts. No seeded personal history, fake people, or simulated messages appear.

**Encrypted file exchange.** Chosen for a verifiable end-to-end flow without inventing a trusted delivery server. This is intentionally inconvenient and not a replacement for a mature messenger. It tests consent and identity concepts but does not establish live-chat market fit.

**Temporary by default.** There is no silent persistence. A prominent banner explains session loss. Users may choose passphrase-protected local persistence. A vault is a storage decision, not a new account.

**Mandatory short consent review.** Intention is not morally graded or analyzed by AI. It stays locally in the prepared-file history. A user-chosen delay is additional friction, not the sole safeguard.

**Working label.** Keep branding reversible until a distinctive name is screened and cleared.

## Acceptance criteria

- Saving a note creates no contact action, public object, or app-initiated network request.
- Cancelling review creates no message file and no notification.
- A changed payload or recipient cannot reuse old consent.
- Unverified or blocked recipients cannot receive newly prepared files.
- Received content is not decrypted before explicit acceptance.
- Wrong-recipient, corrupted, or replayed files fail closed.
- The public shelf is absent by default, including direct navigation while disabled.
- Persistence uses encrypted ciphertext; a wrong passphrase does not partially restore data.
- Deletion wording never implies deletion of externally saved copies.

## Usability research before live messaging

Run moderated tasks with 5–8 willing testers using artificial data. Ask them to save a private thought, predict who can see it, prepare a share and cancel, compare fingerprints, open an imported message, and restore a backup. Record observations only with explicit research consent.

Measure:

- Correct predictions of audience and next action.
- Unintended exports and unintended recipient selection.
- Ability to cancel without fear of notification.
- Successful backup/restore and comprehension of session loss.
- Whether friction improves confidence or merely causes frustration.
- Whether users find value with no contacts.

No background analytics are implemented. Do not optimize time spent or contact count as success metrics.

## Release path

1. Complete device/accessibility QA and revise file-handling friction.
2. Test the concept against real adjacent apps and talk to potential users.
3. Select a maintained, reviewed messaging protocol and design consent-aware live transport.
4. Implement key continuity, device lifecycle, delivery reliability, abuse defenses, and recovery choices.
5. Commission independent security review before sensitive-data claims or broad release.
6. Consider sustainable paid utility or subscription only after demonstrating standalone value; avoid ads/data monetization that conflict with the product promise.

## Edition 0.3 design implementation

No visible branding or prompts on arrival. Options reveals the name and brand line, with descriptive destinations. Desktop navigation uses two columns; mobile uses a single scrollable panel. Notes have large titles, restrained metadata, and separate deliberate-sharing controls. The editor prioritizes uninterrupted writing. Instructions for file exchange are available in an expandable section. Privacy limitations and source downloads remain accessible without unlocking or creating a session. Unknown routes fail back to the empty opening. Task navigation moves keyboard focus to main content. All typography is locally available; no motion or decorative imagery is loaded.

## Edition 0.4 frontend

Three main destinations: Notes, Connections, Controls. A task navigation strip supports direct movement; quiet entry remains empty. Connections groups identity cards, preparation, unopened/received files, and prepared records. The scope question explicitly covers the recipient, exact content, and copying consequences in one required acknowledgment. A private reason is optional and never sent.

This release implements the frontend and navigation/draft/error improvements, not every proposed state-machine change. The full future lock-recovery design and first-save storage choice remain outstanding. Manual Save remains the note commit action.

## Edition 0.5 motion and typography principles

User-requested light motion applies to deliberate interactions only. Keep the quiet opening static, never animate all content on repeated renders, never delay lock/close for an exit animation, and show urgent failures immediately. Respect prefers-reduced-motion. Bundle licensed Manrope locally, retain clear fallback fonts and monospace key fingerprints, and preserve readable focus and touch targets.


## Quiet surface principle

The home offers only the name Enselm as its entry. Every action should feel optional and deliberate: open space, restrained type, fine rules, gentle response to touch. Avoid numbered menu choices, heavy cards, and bright filled buttons. Keep legibility and explicit save/lock/consent states; quietness must not obscure a consequence.


## Edition 0.6: deliberate server delivery

The earlier file-only scope is extended by an optional encrypted relay. A saved encrypted vault and local identity are required. Mailbox enrollment and per-person receiving permission are explicit, independent decisions. File download remains default; server queueing requires a deliberate transport choice and exact-content consent. Incoming retrieval happens only when Check messages is chosen and never opens content automatically.

The backend persists only public routing/permission metadata and encrypted envelopes. Queueing is not delivery/read confirmation. Network ambiguity is visible and retry reuses a persisted envelope ID. Existing still home and quiet surfaces remain the product baseline. This release remains owner-private; public access, push, live presence, device synchronization, audited protocol replacement and native mobile remain outside this release.
