# Enselm edition 0.5 — October 17, 2026

## Product decision

Quietness within remains the organizing principle. Arrival asks nothing; Options reveals Notes, Connections, and Controls. Communication stays a deliberate encrypted file exchange, with explicit recipient verification and incoming opening consent. No live delivery or new account service is introduced.

## Team contributions

Design reviewers evaluated typography, restrained motion, navigation, and truthful state language. Frontend engineering bundled Manrope and its license, added reduced-motion-aware transitions, and improved mobile input/target sizes. State engineering strengthened asynchronous cancellation, serialized save handling, backup capture, lock behavior, and observed storage-conflict handling. A separate security-focused agent reviewed those changes and challenged cancellation races.

All reviews are AI-assisted source reviews. They are not an independent professional security audit or device acceptance test. See VALIDATION.md for the final executed checks.

## Release boundaries

Lock waits for encrypted persistence while editing is frozen. If saving fails, the app retains the recoverable session and explicitly reports that it remains unlocked. It does not claim a successful lock or guaranteed memory erasure. Use one active vault tab; storage-conflict detection is best effort and cannot provide an atomic cross-tab transaction.

The full design backlog still includes first-save storage selection, continuously autosaved encrypted editor drafts, ciphertext-only recovery after failed lock, separate file-creation and download steps, and richer per-contact history. Browser/iPhone, accessibility, and independent protocol review remain required before sensitive use.

Publication preserves the existing owner-only hosted audience. Source, setup instructions, tests, product specification, and threat model remain downloadable from Privacy & limitations.
