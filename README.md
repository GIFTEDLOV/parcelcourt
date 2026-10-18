# ParcelCourt

Review delivery claims against a frozen handoff promise, attested evidence, two-party challenges and semantic consensus.

**Package:** v4.0.0-rc.1 · **Network:** Studionet `61999` · **Contract:** [`0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72`](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72)

## Description

ParcelCourt is a full GenLayer application for a delivery claim lifecycle. Creator and recipient consent before freezing the handoff promise; a separate attestor wallet commits to the evidence digest and source reference. The browser reads a canonical paged case registry and hash-linked semantic history and supports case actions, challenges, re-adjudication and finalization.

## Deployment provenance

- RPC: `https://studio.genlayer.com/api`
- Exact deployed-source SHA-256: `302a0db3f6eca2266677af095ab98a80765221f890f3fd0d028bfaf88de7e224`
- Independently recomputed ABI schema SHA-256: `cef0fd7d95e3e616bc62644966e692e28ec805bf1fa738043a0e75e71dc043a4`
- `getContractCode` parity: exact match with `contracts/parcelcourt.py`.

## Existing live case

Case `GLV4-parcelcourt-39138804500` reached `FINALIZED`, round 2, with terminal verdict **UNRESOLVED**. Evidence is in `evidence/parcelcourt-live.json`; the recorded run is [39142055216](https://github.com/GIFTEDLOV/driftproof/actions/runs/39142055216) for NoticeClock and [39138804500](https://github.com/GIFTEDLOV/driftproof/actions/runs/39138804500) for the other projects. Run 39138804500 as a whole failed because NoticeClock disagreed; the three case artifacts preserved here individually report `PASS`. Source evidence is synthetic and labeled.

## Release status

The existing deployed V4 contract is preserved and byte-verified. **This package is not submission-qualified as a complete release yet.** ParcelCourt and ShiftFair production URLs still serve older read-only bundles. Their updated source in `web/` is not deployed, and signing remains disabled (`RELEASE_QUALIFIED=false`) until a funded ephemeral-signer browser transaction passes actual GenVM receipt and canonical-state checks. No live positive verdict is claimed.

## Run checks

Requirements: Python 3.12+, Node.js 22+, npm.

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m genvm_linter.cli lint contracts/parcelcourt.py
npm ci
npm run verify:live
```

For the two frontend repos: `cd web; npm ci; npm run check; npm test; npm run build; npm audit --audit-level=high`. Python tests use an explicit local API fixture; they are regression tests, not live consensus proof. The read-only verifier independently checks code bytes, ABI, receipt summaries, canonical state and history through GenLayerJS 1.1.8.

See [Security](docs/SECURITY.md), [Deployment](docs/DEPLOYMENT.md), [Rejection prevention](docs/REJECTION_PREVENTION.md), [Submission dossier](docs/SUBMISSION.md) and [Release status](docs/RELEASE.md). MIT license in `LICENSE`.
