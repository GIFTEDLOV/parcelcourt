# GenLayer submission dossier — ParcelCourt

## Project name

ParcelCourt

## Short description

Review delivery claims against a frozen handoff promise, attested evidence, two-party challenges and semantic consensus.

## Detailed description

ParcelCourt is a full GenLayer application for a delivery claim lifecycle. Creator and recipient consent before freezing the handoff promise; a separate attestor wallet commits to the evidence digest and source reference. The browser reads a canonical paged case registry and hash-linked semantic history and supports case actions, challenges, re-adjudication and finalization.

## Problem solved

Delivery disputes depend on natural-language handoff promises and evidence that may be incomplete, manipulated or contradictory.

## Why this requires a GenLayer Intelligent Contract

Validators independently evaluate delivery claims against the exact frozen promise and evidence. A conventional deterministic workflow cannot decide whether a handoff record substantively satisfies that promise.

## Genuine semantic-consensus behavior

Validators independently classify handoff_matches_promise, authorized_recipient_supported and evidence_sufficient. Strict vector validation and a bounded deterministic verdict prevent model output from selecting actors, parameters, deadlines or money. The second round includes challenge text; one party cannot take the other party’s response slot.

## GitHub repository URL

[https://github.com/GIFTEDLOV/parcelcourt](https://github.com/GIFTEDLOV/parcelcourt)

## Production app URL

https://parcelcourt-genlayer.vercel.app

## Studionet deployment

- Chain 61999, RPC `https://studio.genlayer.com/api`
- Contract: [0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72)
- Explorer: [https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72)
- Verified source SHA-256: `302a0db3f6eca2266677af095ab98a80765221f890f3fd0d028bfaf88de7e224`
- ABI schema SHA-256: `cef0fd7d95e3e616bc62644966e692e28ec805bf1fa738043a0e75e71dc043a4`

## Live demonstration evidence

- Case `GLV4-parcelcourt-39138804500` finalized at round 2; recorded verdict **UNRESOLVED**.
- First and second semantic transaction hashes and finalization hash are preserved in `evidence/parcelcourt-live.json`.
- [GitHub workflow run 39138804500](https://github.com/GIFTEDLOV/driftproof/actions/runs/39138804500); exact transaction explorer links are included in the source artifact.
- Qualification source records are synthetic and labelled; this proves GenLayer behavior, not a real-world issuer’s identity or the truth of a physical record.

## Security and qualification summary

The deployed V4 source is byte-identical to the repository source; the deployed ABI matches the locally generated schema. The local regression suite covers role separation, state transitions, source hashes, strict semantic schemas, validator disagreement, prompt injection, challenge fairness, deadlines, duplicates/replay, numeric bounds, address-serialization compatibility and history integrity. Live workflow evidence records transaction status, GenVM execution and canonical readback.

The current production UI still serves an older read-only build; `RELEASE_QUALIFIED=false`. A real funded ephemeral-signer E2E and a new production deployment are outstanding. This project is not yet fully submission-ready.

## Instructions for reviewers

1. Inspect `contracts/parcelcourt.py` and verify its hash and ABI using `npm run verify:live`.
2. Run `python -m pytest -q`, `python -m genvm_linter.cli lint contracts/parcelcourt.py`, `npm ci`, and `npm run verify:live`.
3. Read `evidence/parcelcourt-live.json`; preserve the terminal verdict shown above.
4. For apps, open the production URL read-only; wallet signing is deliberately disabled until its real signed-browser qualification completes.

## Known limitations and external trust assumptions

Attestor signing proves agreed-wallet control, not carrier identity, physical delivery or document authenticity. No external carrier identity oracle or asset settlement exists. Live qualification records were synthetic. The updated repository frontend has not been deployed to the public URL.

Public case creation has no global lifetime cap. Pagination limits each page to 100 records, but total storage and the legacy `get_case_ids()` view can grow. Semantic execution depends on available non-deterministic model services and validator execution; disagreement is not approval. Invoice/minute outputs do not settle assets.
