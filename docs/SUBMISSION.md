# GenLayer submission dossier ? ParcelCourt

## Project name

ParcelCourt

## Short description

Review delivery claims against a frozen handoff promise, attested evidence, two-party challenges and independent semantic consensus.

## Detailed description

ParcelCourt supports a delivery-claim lifecycle from consent and frozen promise through evidence submission, a distinct attestor, semantic adjudication, two-party challenges, second-round deliberation and finalization. The production app reads paged canonical case records and hash-linked history from Studionet, and provides wallet-validated signing and post-transaction receipt/state reconciliation.

## Problem solved

Delivery disputes depend on natural-language handoff promises and evidence that may be incomplete, manipulated or contradictory.

## Why this requires a GenLayer Intelligent Contract

Validators independently assess whether delivery evidence substantiates the exact frozen handoff promise and named recipient. Deterministic code alone cannot determine those semantic facts.

## Genuine semantic-consensus behavior

Leader and validators independently classify handoff_matches_promise, authorized_recipient_supported and evidence_sufficient. The strict vector and bounded deterministic verdict are validated; the second round incorporates both parties' challenge text; disagreement cannot become approval or alter parameters, actors, deadlines or rules.

The leader and validators independently execute the semantic evaluation. The result is schema-validated and contract code alone maps it to permitted outcomes. Evidence and challenge text are untrusted input. Disagreement and invalid output cannot silently become approval. Challenge periods and finalization use contract transaction time.

## GitHub repository

https://github.com/GIFTEDLOV/parcelcourt

## Production app

https://parcelcourt-genlayer.vercel.app

## Studionet deployment

- Network: GenLayer Studionet
- Chain ID: `61999`
- Canonical RPC: `https://studio.genlayer.com/api`
- Contract: [0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72)
- Verified deployed source SHA-256: `302a0db3f6eca2266677af095ab98a80765221f890f3fd0d028bfaf88de7e224`
- ABI schema SHA-256: `cef0fd7d95e3e616bc62644966e692e28ec805bf1fa738043a0e75e71dc043a4`

## Live demonstration and evidence

- Historic case: `GLV4-parcelcourt-39138804500`; status `FINALIZED`; terminal verdict **UNRESOLVED**.
- Qualification workflow: [run 39138804500](https://github.com/GIFTEDLOV/driftproof/actions/runs/39138804500).
- Deployed contract and source parity evidence: `evidence/live-verification.json`.
- Production deployment: `dpl_BQzpZhv1YEKyRrnshfNFQ6CqKXJm`; https://parcelcourt-genlayer-6l9eq86yv-kolofahkelvin16-6437s-projects.vercel.app; production alias https://parcelcourt-genlayer.vercel.app.
- Signed Chromium production wallet verification: `evidence/browser-wallet-e2e.json` with real signed transaction, GenVM receipt and canonical state readback.
- Full synthetic lifecycle: `BROWSER-LIFECYCLE-1792362304421-ParcelCourt`, terminal **UNRESOLVED**. Transaction and state evidence: `evidence/signed-browser-lifecycle.json`, `evidence/signed-browser-lifecycle-readback.json`.
- Production registry verification: passed; `evidence/signed-browser-registry.json` verifies exact case search, terminal state, challenges and hash-linked history.

## Security and qualification summary

Automated adversarial, state-machine, schema, address-compatibility, history-integrity and wallet E2E checks passed. A genuine Chromium wallet signed transaction was reconciled against successful GenVM execution and canonical state. The synthetic full lifecycle finalized UNRESOLVED after both parties challenged. Production registry search/detail verified a two-challenge, two-entry hash-linked history. The public deployment uses the verified V4 contract.

- Exact-main CI: [workflow run 39175259789](https://github.com/GIFTEDLOV/parcelcourt/actions/runs/39175259789) passed for the then-current main commit. The repository Actions history and versioned release provide the exact-HEAD and version-tag qualification results.
- CI covers Python tests, GenVM lint, ABI/schema, source provenance, security analysis and app SDK/build/browser tests where applicable.
- No unresolved Critical or High issue was identified in the release audit.
- The historic 39138804500 workbench is not represented as a four-project PASS: NoticeClock was BLOCKED; the other three project artifacts individually report PASS. NoticeClock's later case 39142055216 passed its lifecycle, with terminal verdict INCONCLUSIVE.

## Instructions for reviewers

1. Inspect `contracts/parcelcourt.py` and `release.json`.
2. Verify the deployed source and ABI against the hashes above using the checked-in read-only verifier.
3. Review the case and receipt evidence under `evidence/`; a FINALIZED label is not treated as proof without successful GenVM execution and canonical state readback.
4. Open https://parcelcourt-genlayer.vercel.app on Studionet chain 61999, connect a test wallet, and use the registry to inspect actual on-chain case state. If Studionet reports its rate limit, wait for its quota window and retry; the app intentionally shows an error rather than mock cases.
5. Treat all qualification cases and source records as synthetic test inputs; do not infer real-world events.

## Known limitations and external trust assumptions

Qualification cases and delivery evidence are synthetic. An attestor signature proves control of the agreed wallet, not carrier identity, physical delivery, or document authenticity. There is no carrier identity oracle, insurance escrow, or settlement. Studionet's public RPC imposed a 500-request/hour rate limit during the ShiftFair registry read; the app surfaces RPC failures without substituting synthetic data. Cases are append-only and not pruned.

## Portal status

The submission fields and evidence package are **prepared for immediate Portal entry**. The final Portal submission has **not** been made. It requires an authenticated Builder Portal session and explicit final-submit authorization; no claim of submission or steward approval is made.
