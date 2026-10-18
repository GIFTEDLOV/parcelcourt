# ParcelCourt

Review delivery claims against a frozen handoff promise, attested evidence, two-party challenges and independent semantic consensus.

**Release:** v4.0.0 ? **Network:** GenLayer Studionet (chain `61999`) ? **Contract:** [`0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72`](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72)

## What it does

ParcelCourt supports a delivery-claim lifecycle from consent and frozen promise through evidence submission, a distinct attestor, semantic adjudication, two-party challenges, second-round deliberation and finalization. The production app reads paged canonical case records and hash-linked history from Studionet, and provides wallet-validated signing and post-transaction receipt/state reconciliation.

## Why GenLayer

Validators independently assess whether delivery evidence substantiates the exact frozen handoff promise and named recipient. Deterministic code alone cannot determine those semantic facts.

Leader and validators independently classify handoff_matches_promise, authorized_recipient_supported and evidence_sufficient. The strict vector and bounded deterministic verdict are validated; the second round incorporates both parties' challenge text; disagreement cannot become approval or alter parameters, actors, deadlines or rules.

## Deployment provenance

- Canonical RPC: `https://studio.genlayer.com/api`
- Exact deployed source SHA-256: `302a0db3f6eca2266677af095ab98a80765221f890f3fd0d028bfaf88de7e224`
- ABI schema SHA-256: `cef0fd7d95e3e616bc62644966e692e28ec805bf1fa738043a0e75e71dc043a4`
- `getContractCode` source-byte parity: exact match with `contracts/parcelcourt.py`.
- Explorer: https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72

## Live qualification

- Historic case: `GLV4-parcelcourt-39138804500`, terminal `UNRESOLVED`; source data is synthetic and explicitly labeled.
- Historic qualification: [GitHub Actions run 39138804500](https://github.com/GIFTEDLOV/driftproof/actions/runs/39138804500).
- Project exact-head CI: [run 39173930011](https://github.com/GIFTEDLOV/parcelcourt/actions/runs/39173930011).
- Production application: https://parcelcourt-genlayer.vercel.app
- Current production deployment: `dpl_8M1N7ixBvj4uFS3Sqvav43xWaEnN` (https://parcelcourt-genlayer-curd0goju-kolofahkelvin16-6437s-projects.vercel.app).
- Signed Chromium lifecycle: `BROWSER-LIFECYCLE-1792362304421-ParcelCourt` finalized `UNRESOLVED`; see [lifecycle evidence](evidence/signed-browser-lifecycle.json), [independent receipt and state readback](evidence/signed-browser-lifecycle-readback.json), and [production browser-wallet evidence](evidence/browser-wallet-e2e.json).
- Production registry browser check: `PASS`; see [registry evidence](evidence/signed-browser-registry.json) when present. Exact case search, final status, challenges, and linked history were verified.

## Release and submission status

The v4.0.0 package source and submission materials are prepared in this independent repository. GitHub release publication follows exact-head CI. Submission fields and review instructions are in [docs/SUBMISSION.md](docs/SUBMISSION.md) and [docs/SUBMISSION_FIELDS.json](docs/SUBMISSION_FIELDS.json). The Portal entry is **prepared, not submitted**; a final Portal submission is an authenticated action.

## Checks

Requirements: Python 3.12+, Node.js 22+, npm.

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m genvm_linter.cli lint contracts/parcelcourt.py
npm ci
npm run verify:live
```

For the frontend: `cd web; npm ci; npm run check; npm test; npm run build`. Production browser wallet test: `$env:APP_URL='https://parcelcourt-genlayer.vercel.app'; npm run test:browser`. Registry test: `$env:APP_URL='https://parcelcourt-genlayer.vercel.app'; npm run test:registry-browser` (requires available Studionet RPC quota).

See [security audit](docs/SECURITY.md), [deployment](docs/DEPLOYMENT.md), [rejection-prevention matrix](docs/REJECTION_PREVENTION.md), and [release qualification](docs/RELEASE.md). MIT License.
