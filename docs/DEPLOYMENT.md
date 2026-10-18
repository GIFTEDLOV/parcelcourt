# Deployment and verification

## Contract

- Network: GenLayer Studionet, chain ID `61999`
- RPC: `https://studio.genlayer.com/api`
- Contract: [0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72](https://explorer-studio.genlayer.com/address/0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72)
- Deployed-source SHA-256: `302a0db3f6eca2266677af095ab98a80765221f890f3fd0d028bfaf88de7e224`
- ABI schema SHA-256: `cef0fd7d95e3e616bc62644966e692e28ec805bf1fa738043a0e75e71dc043a4`
- Source parity: exact `getContractCode` byte match with `contracts/parcelcourt.py`, verified using GenLayerJS 1.1.8.
- The existing verified V4 deployment is preserved. No replacement deployment was made.

## Live evidence

- Historic qualification case `GLV4-parcelcourt-39138804500` finalized `UNRESOLVED`; details and transaction hashes are in the checked-in evidence.
- Qualification Actions: [run 39138804500](https://github.com/GIFTEDLOV/driftproof/actions/runs/39138804500).
- Latest exact-main qualification CI before release preparation: [run 39173930011](https://github.com/GIFTEDLOV/parcelcourt/actions/runs/39173930011).

## Production application

- Alias: https://parcelcourt-genlayer.vercel.app
- Current Vercel production deployment: `dpl_8M1N7ixBvj4uFS3Sqvav43xWaEnN`
- Deployment URL: https://parcelcourt-genlayer-curd0goju-kolofahkelvin16-6437s-projects.vercel.app
- Runtime config binds chain `61999`, contract `0xC0B3De8897015a9aAfDc06EB4d09FD2F4d62BA72`, and the SHA-256 above. Wallet writes are enabled only after real signed-browser qualification.
- The browser test suite covers desktop and 390 px Chromium, account/network changes, rejection, duplicate-write prevention, exact transaction recovery, successful GenVM execution, and canonical state readback.
- Production registry browser verification passed exact-ID search and canonical terminal case/history readback.


## Verifier

`npm run verify:live` is read-only: it retrieves deployed bytes, checks the expected hash and ABI schema, checks receipt execution details, and reads canonical case state and history. It does not broadcast transactions. The signed browser lifecycle scripts perform writes only when explicitly guarded and never retry an uncertain broadcast.

## Reproduction

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m genvm_linter.cli lint contracts/parcelcourt.py
npm ci
npm run verify:live
```

```powershell
cd web
npm ci
npm run check
npm test
npm run build
$env:APP_URL='https://parcelcourt-genlayer.vercel.app'
npm run test:browser
npm run test:registry-browser
```
