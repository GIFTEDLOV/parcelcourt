# Release qualification — ParcelCourt `v4.0.0-rc.1`

- Source SHA-256: `302a0db3f6eca2266677af095ab98a80765221f890f3fd0d028bfaf88de7e224`; deployed address: `0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72`; ABI SHA-256: `cef0fd7d95e3e616bc62644966e692e28ec805bf1fa738043a0e75e71dc043a4`.
- Lifecycle case `GLV4-parcelcourt-39138804500` is `FINALIZED` with verdict `UNRESOLVED`; all three transactions are recorded in `evidence/parcelcourt-live.json`. Its source reference is synthetic and labeled.
- Run 39138804500 overall failed at NoticeClock majority disagreement; the three artifacts for other projects individually recorded PASS. NoticeClock’s later run 39142055216 passed its lifecycle and ended INCONCLUSIVE.
- Original deployment run 39138161003 concluded failure in live qualification after deployment and byte verification passed.

The current production app https://parcelcourt-genlayer.vercel.app serves an older read-only deployment. Updated `web/` source passed local desktop/390 px Chromium checks and real RPC reads. Production mobile still overflows. Public writes remain locked; a funded ephemeral-signer transaction, execution receipt, canonical readback, production rebuild/redeploy and production-browser recheck are outstanding.

**Status:** source and contract provenance are verified; this release candidate is not yet fully submission-ready. Do not enable `RELEASE_QUALIFIED` or submit a full-application readiness claim until the app acceptance criteria pass.
