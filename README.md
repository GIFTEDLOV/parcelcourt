# ParcelCourt

> **Adversarially reviewable proof-of-delivery disputes resolved against frozen promises with GenLayer Intelligent Contracts.**

[![GenLayer Network](https://img.shields.io/badge/Network-GenLayer%20Studionet%20(61999)-6affd8?style=flat-square)](https://studio.genlayer.com)
[![Contract](https://img.shields.io/badge/Contract-0xC0B3...BA72-blue?style=flat-square)](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72)
[![Contract Tests](https://img.shields.io/badge/Python%20Tests-18%2F18%20PASS-brightgreen?style=flat-square)]()
[![Frontend Tests](https://img.shields.io/badge/Frontend%20Tests-10%2F10%20PASS-brightgreen?style=flat-square)]()
[![Browser E2E](https://img.shields.io/badge/Playwright%20E2E-PASS%20(Desktop%20%2B%20Mobile)-success?style=flat-square)]()
[![Live App](https://img.shields.io/badge/Live%20App-Vercel%20Production-purple?style=flat-square)](https://parcelcourt-genlayer.vercel.app)

---

## 1. What It Does

ParcelCourt resolves disputed parcel handoffs by separating deterministic governance from bounded semantic adjudication:
1. **Frozen Handoff Promise**: Buyer and merchant consent to immutable delivery terms, time boundaries, and an independent designated attestor address before physical handoff occurs.
2. **Hash-Bound Evidence**: Delivery documentation (tracking receipts, recipient signatures, carrier photos) is digest-bound and locked on-chain.
3. **Third-Party Attestation**: The nominated attestor signs an on-chain attestation binding the delivery digest to an external verifiable reference.
4. **GenLayer Semantic Consensus**: Independent validators assess whether evidence satisfies the frozen terms, recipient authorization is substantiated, and evidence is uncorrupted.
5. **Two-Party Dispute & Finalization**: Both parties have independent appeal/challenge slots for a second consensus round before immutable finalization.

---

## 2. Why GenLayer

Traditional deterministic smart contracts cannot evaluate whether an unstructured delivery receipt, photograph description, or signature matches natural-language terms. Centralized oracles, conversely, introduce single-point-of-failure censorship and discretionary judgment.

GenLayer resolves this through **Optimistic Democracy**:
- **Leader & Validator Consensus**: A leader validator proposes an interpretation; a committee of independent validators re-executes the evaluation and compares the strict boolean fact vector.
- **Narrow Semantic Surface**: Validators output only three bounded booleans:
  - `handoff_matches_promise`
  - `authorized_recipient_supported`
  - `evidence_sufficient`
- **Deterministic Derivation**: Smart contract code deterministically maps the boolean vector into outcomes:
  - $\text{All True} \longrightarrow \mathbf{SUPPORTED\_DELIVERY}$
  - $\text{Sufficient but Terms / Recipient Unmet} \longrightarrow \mathbf{NOT\_SUPPORTED}$
  - $\text{Insufficient or Conflicting Evidence} \longrightarrow \mathbf{UNRESOLVED}$
- **Adversarially Hardened Prompts**: Model prompts treat evidence and challenge text as untrusted `DATA`, ignoring injection attempts, fake system directives, and manipulated formats.

---

## 3. Steward Feedback & Remediation Summary

In response to steward feedback regarding wallet connectivity (*"No wallet connet?"*), ParcelCourt was upgraded to the portfolio's top-tier UX and engineering standards:

| Feedback Point | Root Cause Identified | Engineering Remediation |
| :--- | :--- | :--- |
| **"No wallet connet?"** | The original header lacked a persistent connect button; connection was buried inside the 6th tab (`On-chain`). | Added a persistent **Web3 Wallet Connect** component in the global header across all views with live network telemetry (`Studionet · 61999`). |
| **Network Mismatch Errors** | Visiting with MetaMask on Ethereum/Sepolia caused hard exceptions rather than requesting chain switch. | Integrated automated **EIP-3085 / EIP-3326 network switching and chain addition** for GenLayer Studionet (`0xF22F` / `61999`). |
| **Wallet Interaction Drawer** | Reviewers lacked visibility into active account parameters and chain explorers. | Built an interactive **Web3 Account Drawer** with 1-click address copy, Explorer link, network switcher, and disconnect controls. |
| **Case Lifecycle Clarity** | Users could not visually track dispute progression through the multi-party flow. | Implemented an **8-Stage Visual Progress Rail** in the case inspector (`Draft` $\to$ `Consent` $\to$ `Frozen` $\to$ `Evidence` $\to$ `Attested` $\to$ `Assessed` $\to$ `Challenge` $\to$ `Finalized`). |
| **Validator Consensus Telemetry** | Fact vector evaluation was obscured behind raw JSON data. | Added an **AI Consensus Fact Vector Matrix** displaying exact validator evaluations and deterministic rule derivation. |

See [docs/STEWARD_RESPONSE.md](docs/STEWARD_RESPONSE.md) for the complete remediation dossier.

---

## 4. Deployed Provenance & Live Verification

- **Network**: GenLayer Studionet
- **Chain ID**: `61999` (`0xF22F`)
- **Canonical RPC**: `https://studio.genlayer.com/api`
- **Contract Address**: [`0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72`](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72)
- **Deployed Source SHA-256**: `302a0db3f6eca2266677af095ab98a80765221f890f3fd0d028bfaf88de7e224`
- **ABI Schema SHA-256**: `cef0fd7d95e3e616bc62644966e692e28ec805bf1fa738043a0e75e71dc043a4`
- **`getContractCode` Byte Parity**: Exact 1:1 match with `contracts/parcelcourt.py`
- **Production Application**: [https://parcelcourt-genlayer.vercel.app](https://parcelcourt-genlayer.vercel.app)
- **Live Qualification Case**: `GLV4-parcelcourt-39138804500` (Terminal Verdict: `UNRESOLVED`, 2 consensus rounds, 2 challenges, verified hash chain)

---

## 5. Local Verification & Testing

### Prerequisites
- Python 3.12+
- Node.js 22+
- npm

### Run Test Suites

```powershell
# 1. Python contract & state machine regression tests (18 tests)
python -m pip install -r requirements-dev.txt
python -m pytest tests -q

# 2. Static security scan
python -m compileall -q contracts
python -m bandit -q -r contracts

# 3. Live Studionet RPC & Bytecode verification
npm install
npm run verify:live

# 4. Frontend unit tests & syntax validation
cd web
npm install
npm run check
npm test
npm run build

# 5. Playwright Browser E2E (Mobile + Desktop + Wallet Reconnection)
npm run test:browser
```

---

## 6. Security Architecture & Threat Model

1. **Deterministic Authority Boundary**:
   - Only the buyer (`recipient`) can provide consent.
   - Only the merchant (`creator`) can freeze terms after consent.
   - Only the designated third-party attestor (`attestor`) can attest locked evidence.
   - Both parties must be distinct from the attestor and from each other.
2. **Replay & Timestamp Protection**:
   - Time boundaries rely exclusively on transaction block timestamps (`gl.message.raw['datetime']`), never client local clocks.
   - Evidence digests and challenge hashes are checked via cryptographic SHA-256 comparisons.
3. **Crash-Safe Transaction Lifecycle**:
   - The frontend persists broadcast transaction hashes before polling.
   - Transactions require verified GenVM execution receipts (`FINISHED_WITH_RETURN`) and state readbacks before being treated as successful.
4. **Append-Only History Integrity**:
   - Every adjudication round is appended to an immutable hash chain where each entry references the SHA-256 digest of the previous record.

---

## 7. Known Limitations & Trust Assumptions

- **Demonstration Records**: Qualification records use synthetic delivery data for adversarial testing; attestation proves control of the nominated attestor wallet, not physical delivery or carrier identity.
- **No Direct Escrow Movement**: ParcelCourt is an adjudication and dispute-resolution primitive; settlement execution or token transfer is handled by external vault integrations.
- **RPC Quota Management**: Studionet public RPC may enforce rate limits; the frontend gracefully surfaces RPC status without fabricating state.

---

## 8. Documentation Index

- [docs/STEWARD_RESPONSE.md](docs/STEWARD_RESPONSE.md) — Steward feedback remediation dossier.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Studionet deployment and RPC parameters.
- [docs/SECURITY.md](docs/SECURITY.md) — Threat model, state invariants, and attack mitigations.
- [docs/SUBMISSION.md](docs/SUBMISSION.md) — Complete builder portal submission dossier.
- [docs/REJECTION_PREVENTION.md](docs/REJECTION_PREVENTION.md) — Preflight checklist and rubric alignment.
- [docs/RELEASE.md](docs/RELEASE.md) — Release notes and qualification records.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
