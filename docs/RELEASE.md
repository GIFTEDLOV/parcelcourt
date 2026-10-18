# Release qualification ? ParcelCourt v4.0.0

**Release dossier date:** 2026-10-19
**Release state:** Source, contract, and existing live qualification evidence are preserved. Portal dossier is prepared; final Portal submission is not made.

- Contract address: [0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72).
- Deployed V4 source SHA-256: `302a0db3f6eca2266677af095ab98a80765221f890f3fd0d028bfaf88de7e224`; ABI schema SHA-256: `cef0fd7d95e3e616bc62644966e692e28ec805bf1fa738043a0e75e71dc043a4`.
- Historic case `GLV4-parcelcourt-39138804500`: `FINALIZED / UNRESOLVED`; its source inputs are synthetic and labeled.
- Qualification workflow: [39138804500](https://github.com/GIFTEDLOV/driftproof/actions/runs/39138804500).
- Exact-main CI before release preparation: [39173930011](https://github.com/GIFTEDLOV/parcelcourt/actions/runs/39173930011) passed.
- Production application is `https://parcelcourt-genlayer.vercel.app`; deployment `dpl_8M1N7ixBvj4uFS3Sqvav43xWaEnN` is READY.
- Signed production-browser lifecycle `BROWSER-LIFECYCLE-1792362304421-ParcelCourt` finalized `UNRESOLVED`; a real signed transaction was independently checked against GenVM execution and canonical state.
- Registry read qualification: `PASS`. Exact-ID production search, terminal result, both challenges and hash-linked history were verified.

The original V4 contract deployment is preserved. No contract redeployment or source-hash substitution occurred. The release-verification artifact distinguishes successful transaction finality from successful GenVM execution and canonical state.

**Submission:** prepared in [docs/SUBMISSION.md](SUBMISSION.md) and [docs/SUBMISSION_FIELDS.json](SUBMISSION_FIELDS.json); **not submitted to the Builder Portal**. No steward acceptance is claimed.

See [deployment evidence](DEPLOYMENT.md), [security review](SECURITY.md), [rejection-prevention matrix](REJECTION_PREVENTION.md), and [reviewer instructions](SUBMISSION.md).
