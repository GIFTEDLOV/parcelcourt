import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant } from 'genlayer-js/types';
import { chainUI, getWalletState, subscribeWallet, connectGlobalWallet, disconnectWallet, switchOrAddStudionet } from './onchain.js';
import { CASE_REGISTRY_PAGE_SIZE, shouldCancelRegistryRead, verifyAuditHistory, canPerform } from './qualification.js';

const APP = window.APP;
const ADDRESS = window.CONTRACT_ADDRESS;
const CHAIN_ID = 61999;
const networkClient = createClient({ chain: studionet });
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const shorten = value => String(value ?? '').length > 22 ? `${String(value).slice(0,10)}…${String(value).slice(-6)}` : String(value ?? '');
const stringify = obj => JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
const validContract = /^0x[a-fA-F0-9]{40}$/.test(ADDRESS || '');
let page = 'Overview';
let live = { cases: [], ids: [], total: 0, page: 0, pageSize: CASE_REGISTRY_PAGE_SIZE, loading: false, error: '', checkedAt: null, complete: false };
let refreshGeneration=0;
let activeSearch = '';
const parsed = value => typeof value === 'string' ? JSON.parse(value) : value;
const read = async (functionName, args=[]) => networkClient.readContract({ address: ADDRESS, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
const pill = status => `<span class="pill">${esc(status || 'UNKNOWN')}</span>`;
const panel = (heading, body, hint='') => `<div class="surface"><div class="section-head"><h2>${esc(heading)}</h2><span class="hint">${esc(hint)}</span></div>${body}</div>`;
const progress = () => `<div class="release"><span class="signal"></span><span><strong>GENLAYER STUDIONET / LIVE CASES.</strong> ${validContract ? 'These records are read from finalized V4 contract state.' : 'No verified contract configured.'} Verified source ${esc(window.CONTRACT_SOURCE_SHA256||'unavailable')}. Wallet signing is ${window.RELEASE_QUALIFIED===true?'enabled after qualification':'locked pending signed-browser and live execution evidence'}. No simulated case is represented as a blockchain record. ${live.checkedAt ? 'Last refreshed: '+esc(live.checkedAt) : ''}</span></div>`;
const badge = r => pill(r.status);

function renderLifecycleStepper(status) {
  const steps = [
    { key: 'DRAFT', label: '1. Draft' },
    { key: 'CONSENT', label: '2. Consent' },
    { key: 'FROZEN', label: '3. Frozen' },
    { key: 'EVIDENCE_LOCKED', label: '4. Evidence' },
    { key: 'ATTESTED', label: '5. Attested' },
    { key: 'ASSESSED', label: '6. Assessed' },
    { key: 'CHALLENGED', label: '7. Challenge' },
    { key: 'FINALIZED', label: '8. Finalized' }
  ];
  
  const order = { 'DRAFT': 0, 'FROZEN': 2, 'EVIDENCE_LOCKED': 3, 'ATTESTED': 4, 'ASSESSED': 5, 'CHALLENGED': 6, 'FINALIZED': 7 };
  const currentIdx = order[status] ?? 0;
  
  return `<div class="lifecycle-stepper" aria-label="Case Lifecycle Progress">
    ${steps.map((s, idx) => {
      const isCompleted = idx < currentIdx;
      const isActive = idx === currentIdx;
      const cls = isCompleted ? 'step completed' : isActive ? 'step active' : 'step';
      return `<div class="${cls}">
        <span class="step-num">${isCompleted ? '✓' : idx + 1}</span>
        <span class="step-label">${s.label}</span>
      </div>`;
    }).join('')}
  </div>`;
}

function renderConsensusMatrix(record, history) {
  if (!history || !history.length) {
    return `<div class="surface" style="margin-top:14px"><div class="section-head"><h2>GenLayer AI Consensus Facts</h2><span class="hint">Awaiting semantic round</span></div><p class="muted">Independent AI validators evaluate evidence once submitted and attested.</p></div>`;
  }
  const latestRound = history[history.length - 1];
  const vector = latestRound?.vector || {};
  const hasVector = Object.keys(vector).length > 0;
  
  const factBadge = val => val === true ? `<span class="fact-true">TRUE</span>` : val === false ? `<span class="fact-false">FALSE</span>` : `<span class="fact-pending">PENDING</span>`;
  
  return `<div class="surface" style="margin-top:14px">
    <div class="section-head">
      <h2>GenLayer AI Consensus Facts</h2>
      <span class="hint">Round ${esc(latestRound?.round || record.round || 1)} · Strict Validator Equivalence</span>
    </div>
    <div class="consensus-matrix">
      <div class="consensus-head">
        <span>Semantic Factor</span>
        <span>AI Verdict</span>
        <span>Deterministic Rule Effect</span>
      </div>
      <div class="consensus-row">
        <div><b>Handoff matches promise</b><small class="desc">Does delivery match terms in the frozen agreement?</small></div>
        <div>${factBadge(vector.handoff_matches_promise)}</div>
        <small class="muted">Required for SUPPORTED_DELIVERY</small>
      </div>
      <div class="consensus-row">
        <div><b>Authorized recipient supported</b><small class="desc">Is parcel accepted by or for the designated recipient?</small></div>
        <div>${factBadge(vector.authorized_recipient_supported)}</div>
        <small class="muted">Required for SUPPORTED_DELIVERY</small>
      </div>
      <div class="consensus-row">
        <div><b>Evidence sufficient</b><small class="desc">Is external proof authentic, complete & verified?</small></div>
        <div>${factBadge(vector.evidence_sufficient)}</div>
        <small class="muted">If false, deterministically UNRESOLVED</small>
      </div>
    </div>
    <p class="footnote" style="margin-top:8px">Deterministic outcome: <b>${esc(record.result || latestRound?.verdict || 'Awaiting finality')}</b>. GenLayer validators vote strictly on facts; smart contract code alone maps facts to outcomes.</p>
  </div>`;
}

function renderRoleBanner(record) {
  const ws = getWalletState();
  if (!ws.connected || !ws.address) {
    return `<div class="role-banner">
      <div><span>Wallet not connected. Connect your wallet to participate in this case.</span></div>
      <button class="quick-action-btn" id="modal-connect-wallet">Connect Wallet</button>
    </div>`;
  }
  const userAddr = ws.address.toLowerCase();
  const isCreator = record.creator?.toLowerCase() === userAddr;
  const isRecipient = record.recipient?.toLowerCase() === userAddr;
  const isAttestor = record.attestor?.toLowerCase() === userAddr;
  
  let roleTitle = 'Observer';
  let eligibleAction = null;
  const now = Math.floor(Date.now() / 1000);
  
  if (isCreator) {
    roleTitle = 'Creator';
    if (canPerform('freeze', record, ws.address, now)) eligibleAction = { name: 'freeze', label: 'Freeze Clause' };
    else if (canPerform('submit_evidence', record, ws.address, now)) eligibleAction = { name: 'submit_evidence', label: 'Submit Evidence' };
    else if (canPerform('adjudicate', record, ws.address, now)) eligibleAction = { name: 'adjudicate', label: 'Trigger Adjudication' };
    else if (canPerform('challenge', record, ws.address, now)) eligibleAction = { name: 'challenge', label: 'Submit Challenge' };
  } else if (isRecipient) {
    roleTitle = 'Counterparty (Recipient)';
    if (canPerform('consent', record, ws.address, now)) eligibleAction = { name: 'consent', label: 'Provide Counterparty Consent' };
    else if (canPerform('submit_evidence', record, ws.address, now)) eligibleAction = { name: 'submit_evidence', label: 'Submit Evidence' };
    else if (canPerform('adjudicate', record, ws.address, now)) eligibleAction = { name: 'adjudicate', label: 'Trigger Adjudication' };
    else if (canPerform('challenge', record, ws.address, now)) eligibleAction = { name: 'challenge', label: 'Submit Challenge' };
  } else if (isAttestor) {
    roleTitle = 'Designated Attestor';
    if (canPerform('attest_evidence', record, ws.address, now)) eligibleAction = { name: 'attest_evidence', label: 'Attest Locked Evidence' };
  }
  
  if (canPerform('finalize_case', record, ws.address, now)) {
    eligibleAction = { name: 'finalize_case', label: 'Finalize Case' };
  }

  return `<div class="role-banner">
    <div>
      <span class="role-badge">Your Role: ${esc(roleTitle)}</span>
      <span class="muted" style="margin-left:8px">${esc(shorten(ws.address))}</span>
    </div>
    ${eligibleAction ? `<button class="quick-action-btn" id="modal-quick-action" data-action="${esc(eligibleAction.name)}" data-case="${esc(record.id)}">${esc(eligibleAction.label)} →</button>` : `<span class="hint">No pending actions for this wallet</span>`}
  </div>`;
}

function updateGlobalWalletUI(state) {
  const btn = $('global-wallet-btn');
  const label = $('global-wallet-label');
  const netName = $('global-network-name');
  const dot = $('global-signal-dot');
  const sideTag = $('write-gate-status');
  const sideSignal = $('sidebar-signal');

  if (!state.connected) {
    if (btn) {
      btn.classList.remove('connected');
      btn.title = 'Click to connect MetaMask or Web3 wallet';
    }
    if (label) label.textContent = 'Connect Wallet';
    if (dot) {
      dot.className = 'signal-dot' + (state.address ? ' warning' : '');
    }
    if (netName) {
      netName.textContent = state.address ? `Wrong Network (${state.chainId})` : 'Studionet · 61999';
    }
    if (sideTag) {
      sideTag.textContent = state.address ? `Wrong network (${state.chainId})` : 'Wallet not connected';
    }
    if (sideSignal) {
      sideSignal.style.background = state.address ? '#ff6b6b' : '#e9b46f';
    }
  } else {
    if (btn) {
      btn.classList.add('connected');
      btn.title = `Connected: ${state.address}\nNetwork: GenLayer Studionet (61999)\nClick to view wallet details`;
    }
    if (label) label.textContent = shorten(state.address);
    if (dot) dot.className = 'signal-dot connected';
    if (netName) netName.textContent = 'Studionet · 61999';
    if (sideTag) sideTag.textContent = `Connected: ${shorten(state.address)}`;
    if (sideSignal) sideSignal.style.background = '#6affd8';
  }
}

function openWalletModal() {
  const ws = getWalletState();
  const modal = $('wallet-modal');
  const body = $('wallet-modal-body');
  if (!modal || !body) return;
  
  if (!ws.address) {
    body.innerHTML = `
      <div class="wallet-status-card" style="text-align:center;padding:24px 16px">
        <div style="font-size:36px;margin-bottom:12px">⬡</div>
        <h3>No Wallet Connected</h3>
        <p class="muted" style="margin:8px 0 16px">Connect your browser wallet (e.g. MetaMask) to sign multi-party transactions on GenLayer Studionet.</p>
        <button class="cta" id="wallet-modal-connect" style="width:100%">Connect Wallet</button>
      </div>
      <div class="surface" style="margin-top:14px">
        <div class="section-head"><h2>Studionet Configuration</h2></div>
        <p class="mono" style="font-size:11px">Chain ID: 61999 (0xF22F)<br/>RPC: https://studio.genlayer.com/api<br/>Explorer: https://explorer-studio.genlayer.com</p>
      </div>`;
    $('wallet-modal-connect')?.addEventListener('click', async () => {
      try {
        await connectGlobalWallet();
        openWalletModal();
      } catch (e) {
        alert(e.message || 'Connection failed');
      }
    });
  } else {
    body.innerHTML = `
      <div class="wallet-detail-grid">
        <div class="wallet-status-card">
          <div class="wallet-status-header">
            <span class="eyebrow">ACTIVE ACCOUNT</span>
            <span class="pill" style="background:${ws.isStudionet ? 'color-mix(in srgb,var(--accent) 20%,transparent)' : '#ff6b6b33'};color:${ws.isStudionet ? 'var(--accent)' : '#ff8e8e'}">
              ${ws.isStudionet ? 'Studionet 61999' : 'Wrong Network'}
            </span>
          </div>
          <div class="wallet-address-box">
            <span class="mono" style="font-weight:700">${esc(ws.address)}</span>
            <button class="copy-pill-btn" id="copy-wallet-address">Copy</button>
          </div>
          <div style="margin-top:10px">
            <a class="link" href="https://explorer-studio.genlayer.com/address/${esc(ws.address)}" target="_blank" rel="noopener noreferrer">View on GenLayer Explorer ↗</a>
          </div>
        </div>

        <div class="surface">
          <div class="section-head"><h2>Network Integrity</h2></div>
          <p class="muted">RPC: <code>https://studio.genlayer.com/api</code><br/>Contract: <code class="mono">${esc(ws.contractAddress)}</code></p>
          ${!ws.isStudionet ? `<p style="color:#ff8e8e;margin-top:8px">Your wallet is connected to Chain ${ws.chainId}. Please switch to Studionet to sign transactions.</p>` : ''}
        </div>

        <div class="wallet-actions">
          ${!ws.isStudionet ? `<button class="switch-net-btn" id="wallet-modal-switch">Switch to Studionet</button>` : ''}
          <button class="cta" id="wallet-modal-onchain" style="flex:1">Open On-Chain Workspace</button>
          <button class="disconnect-btn" id="wallet-modal-disconnect">Disconnect</button>
        </div>
      </div>`;
    
    $('copy-wallet-address')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(ws.address);
      const btn = $('copy-wallet-address');
      if (btn) btn.textContent = 'Copied!';
      setTimeout(() => { if (btn) btn.textContent = 'Copy'; }, 1800);
    });
    
    $('wallet-modal-switch')?.addEventListener('click', async () => {
      try {
        await switchOrAddStudionet();
        openWalletModal();
      } catch (e) {
        alert('Failed to switch network: ' + (e.message || e));
      }
    });
    
    $('wallet-modal-onchain')?.addEventListener('click', () => {
      modal.hidden = true;
      nav('On-chain');
    });
    
    $('wallet-modal-disconnect')?.addEventListener('click', () => {
      disconnectWallet();
      openWalletModal();
    });
  }
  
  modal.hidden = false;
}

subscribeWallet(updateGlobalWalletUI);
function renderCases(items, emptyMessage='No cases returned from this contract yet.') {
  if (!items.length) return `<div class="blank">${esc(emptyMessage)}</div>`;
  return `<div class="case-list">${items.map(r=>`<div class="case-row" role="button" tabindex="0" data-live-case="${esc(r.id)}"><b>${esc(r.id)}</b><span><b>${esc(r.rule?.slice(0,76)||r.id)}</b><small class="desc">Attestor ${esc(shorten(r.attestor))} · ${esc(r.round || 0)} consensus round(s)</small></span>${badge(r)}<small>${esc(r.consented?'Consented':'Pending consent')}</small></div>`).join('')}</div>`;
}
function loadingNote(){
  if(live.loading) return `<div class="blank">Reading GenLayer contract state…</div>`;
  if(live.error) return `<div class="blank" role="alert">Live read failed: ${esc(live.error)}. There is no simulated fallback.</div>`;
  return '';
}

function renderLandingPage(cases, counts) {
  const safeEmpty = loadingNote();
  const recentCases = cases.slice().reverse().slice(0, 4);

  return `
    <div class="sawad-container">
      <!-- Sawad 2-Column Hero Section -->
      <section class="sawad-hero-grid">
        <!-- Left Column: Iconic White Protocol Card -->
        <div class="sawad-white-card">
          <div class="sawad-white-card-inner-graphic">
            <!-- Concentric Contour Waves Background -->
            <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:0.25;pointer-events:none" viewBox="0 0 300 260" fill="none">
              <circle cx="150" cy="130" r="40" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 4"/>
              <circle cx="150" cy="130" r="75" stroke="#fff" stroke-width="1.5"/>
              <circle cx="150" cy="130" r="115" stroke="#fff" stroke-width="1.5" stroke-dasharray="6 6"/>
              <circle cx="150" cy="130" r="150" stroke="#fff" stroke-width="1.5"/>
            </svg>
            <!-- Shield Graphic with GenLayer Glow -->
            <div style="position:relative;z-index:1;text-align:center">
              <div style="font-size:72px;line-height:1;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.5))">⚖️</div>
              <div style="font-family:ui-monospace,monospace;font-size:11px;font-weight:800;letter-spacing:0.18em;color:#ffffff;margin-top:10px;text-transform:uppercase;background:rgba(0,0,0,0.3);padding:4px 12px;border-radius:20px">
                STUDIONET · 61999
              </div>
            </div>
          </div>
          <div class="sawad-badge-flame">⚡</div>
          <h2 class="sawad-card-name">ParcelCourt</h2>
          <p class="sawad-card-desc">An Intelligent Contract that arbitrates physical handoffs and delivery claims on GenLayer Studionet.</p>
          <div class="sawad-social-icons">
            <a class="sawad-icon-circle" href="https://explorer-studio.genlayer.com/address/${esc(ADDRESS)}" target="_blank" rel="noopener noreferrer" title="View on GenLayer Studio Explorer">↗</a>
            <a class="sawad-icon-circle" href="https://github.com/GIFTEDLOV/parcelcourt" target="_blank" rel="noopener noreferrer" title="View GitHub Repository">◈</a>
            <a class="sawad-icon-circle" href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" title="Read GenLayer Docs">📄</a>
            <a class="sawad-icon-circle" href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer" title="GenLayer Studio RPC">⚡</a>
          </div>
        </div>

        <!-- Right Column: Giant Headline + Stats + 2 Cards -->
        <div class="sawad-hero-right">
          <div class="sawad-headline-stack">
            <span class="sawad-headline-white">INTELLIGENT</span>
            <span class="sawad-headline-ghost">CONTRACT</span>
          </div>
          <p class="sawad-hero-p">
            Passionate about verifiable, tamper-resistant dispute resolution. Transforming natural-language delivery agreements into hash-linked GenVM consensus decisions.
          </p>

          <div class="sawad-stats-row">
            <div class="sawad-stat-item">
              <div class="sawad-stat-num">+${counts.total}</div>
              <div class="sawad-stat-label">Recorded Cases</div>
            </div>
            <div class="sawad-stat-item">
              <div class="sawad-stat-num">+4</div>
              <div class="sawad-stat-label">Role Actors</div>
            </div>
            <div class="sawad-stat-item">
              <div class="sawad-stat-num">+61999</div>
              <div class="sawad-stat-label">Studionet Chain</div>
            </div>
          </div>

          <div class="sawad-cards-row">
            <!-- Orange Card -->
            <div class="sawad-card-orange" id="sawad-card-orange-trigger" role="button" tabindex="0">
              <svg style="position:absolute;top:0;right:0;width:100%;height:100%;opacity:0.25;pointer-events:none" viewBox="0 0 300 200" fill="none">
                <path d="M-50 150 C50 50, 150 200, 250 80 S350 180, 400 100" stroke="#fff" stroke-width="2"/>
                <path d="M-50 180 C50 80, 150 230, 250 110 S350 210, 400 130" stroke="#fff" stroke-width="2"/>
                <path d="M-50 210 C50 110, 150 260, 250 140 S350 240, 400 160" stroke="#fff" stroke-width="2"/>
              </svg>
              <div style="font-size:26px">📚</div>
              <div class="sawad-card-title-orange">Zero-Trust Handoff & Evidence Lock</div>
              <div class="sawad-btn-arrow-circle">→</div>
            </div>

            <!-- Lime Green Card -->
            <div class="sawad-card-lime" id="sawad-card-lime-trigger" role="button" tabindex="0">
              <svg style="position:absolute;top:0;right:0;width:100%;height:100%;opacity:0.2;pointer-events:none" viewBox="0 0 300 200" fill="none">
                <polyline points="0,50 60,180 120,40 180,160 240,30 300,150" stroke="#000" stroke-width="2"/>
                <polyline points="0,80 60,210 120,70 180,190 240,60 300,180" stroke="#000" stroke-width="2"/>
              </svg>
              <div style="font-size:26px">◈</div>
              <div class="sawad-card-title-lime">GenVM AI Consensus Arbitration</div>
              <div class="sawad-btn-arrow-circle-black">→</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: Recent Projects / Cases -->
      <section>
        <div class="sawad-section-title-stack">
          <span class="sawad-section-title-white">RECENT</span>
          <span class="sawad-section-title-ghost">CASES</span>
        </div>
        ${safeEmpty}
        <div class="sawad-project-list">
          ${recentCases.length ? recentCases.map((c, i) => {
            const gradients = [
              'linear-gradient(135deg, #7928ca, #ff0080)',
              'linear-gradient(135deg, #0070f3, #00dfd8)',
              'linear-gradient(135deg, #f46c38, #f9cb28)',
              'linear-gradient(135deg, #10b981, #06b6d4)'
            ];
            return `
              <div class="sawad-project-row" role="button" tabindex="0" data-live-case="${esc(c.id)}">
                <div style="display:flex;align-items:center;min-width:0;flex:1">
                  <div class="sawad-project-thumb" style="background:${gradients[i % gradients.length]}">
                    ◈
                  </div>
                  <div style="min-width:0">
                    <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;margin-bottom:4px">${esc(c.id)}</div>
                    <div style="font-size:14px;color:#998f8f;line-height:1.4">
                      ${esc(c.rule ? (c.rule.slice(0, 80) + (c.rule.length > 80 ? '…' : '')) : 'Standard delivery policy')} · Attestor ${esc(shorten(c.attestor))} · ${esc(c.round || 0)} round(s)
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:16px;flex-shrink:0">
                  ${badge(c)}
                  <span class="sawad-project-arrow">↗</span>
                </div>
              </div>
            `;
          }).join('') : '<div class="blank">No canonical cases recorded yet. Open the On-chain workspace to register a delivery agreement.</div>'}
        </div>
      </section>

      <!-- Section 3: Four Phases of Verification (12 Years of Experience layout) -->
      <section>
        <div class="sawad-section-title-stack">
          <span class="sawad-section-title-white">FOUR PHASES OF</span>
          <span class="sawad-section-title-ghost">VERIFICATION</span>
        </div>
        <div class="sawad-exp-list">
          <div class="sawad-exp-row">
            <div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:6px">Phase 01: Policy Inscription & Escrow Lock</div>
              <p style="font-size:15px;color:#998f8f;margin:0 0 10px;max-width:700px;line-height:1.5">
                Merchant and counterparty freeze delivery conditions, collateral stake, and deadlines into immutable storage slots.
              </p>
              <span style="font-size:13px;font-weight:700;color:#f46c38">Step 01 · Escrow Terms Frozen</span>
            </div>
            <span class="sawad-project-arrow">↗</span>
          </div>

          <div class="sawad-exp-row">
            <div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:6px">Phase 02: Courier Proof & Manifest Attestation</div>
              <p style="font-size:15px;color:#998f8f;margin:0 0 10px;max-width:700px;line-height:1.5">
                Designated courier signs SHA-256 evidence digests, geolocation telemetry, and physical parcel handoff timestamps.
              </p>
              <span style="font-size:13px;font-weight:700;color:#c5ff41">Step 02 · Cryptographic Proof</span>
            </div>
            <span class="sawad-project-arrow">↗</span>
          </div>

          <div class="sawad-exp-row">
            <div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:6px">Phase 03: GenVM Decentralized AI Deliberation</div>
              <p style="font-size:15px;color:#998f8f;margin:0 0 10px;max-width:700px;line-height:1.5">
                Independent consensus validators assess proof compliance against frozen natural-language principles using comparative prompts.
              </p>
              <span style="font-size:13px;font-weight:700;color:#6affd8">Step 03 · Multi-Round Consensus</span>
            </div>
            <span class="sawad-project-arrow">↗</span>
          </div>

          <div class="sawad-exp-row">
            <div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;margin-bottom:6px">Phase 04: Challenge Window & Final Settlement</div>
              <p style="font-size:15px;color:#998f8f;margin:0 0 10px;max-width:700px;line-height:1.5">
                Contesting window for disputed delivery states prior to automated GenVM payout distribution and terminal state lock.
              </p>
              <span style="font-size:13px;font-weight:700;color:#ff8e8e">Step 04 · Final Settlement</span>
            </div>
            <span class="sawad-project-arrow">↗</span>
          </div>
        </div>
      </section>

      <!-- Floating Sawad Action Dock -->
      <div class="sawad-floating-dock">
        <button class="sawad-floating-btn lime" id="sawad-float-launch">⚡ Launch Workspace</button>
        <button class="sawad-floating-btn orange" id="sawad-float-wallet">⬡ Connect Wallet</button>
      </div>
    </div>
  `;
}

const refreshButton = `<button id="live-refresh" class="tab">Refresh live records</button>`;
function render(name){
  if(name==='On-chain') return chainUI.render();
  const cases=live.cases;
  const safeEmpty = loadingNote();
  const records = cases.filter(x=>(x.id+' '+(x.status||'')+' '+(x.rule||'')).toLowerCase().includes(activeSearch.toLowerCase()));
  const counts={total:cases.length,frozen:cases.filter(x=>['FROZEN','EVIDENCE_LOCKED','ATTESTED'].includes(x.status)).length,assessed:cases.filter(x=>x.round>0).length,challenged:cases.filter(x=>(x.challenges||[]).length>0).length};
  if(name==='Overview') return renderLandingPage(cases, counts);
  if(['Cases','Claims'].includes(name)) return progress()+panel('Canonical case registry',`<div class="toolbar registry-tools"><input id="case-filter" class="input" aria-label="Search current page of actual cases" placeholder="Search this page by ID, status or frozen rule" value="${esc(activeSearch)}"/>${refreshButton}</div>${safeEmpty}<div id="filtered-cases">${renderCases(records,'No matching cases on this page.')}</div><div class="toolbar registry-pages"><span class="hint">${cases.length} records on page ${live.page+1} / ${Math.max(1,Math.ceil(live.total/live.pageSize))} · ${live.total} total on chain</span><div><button id="cases-prev" class="tab" ${live.page===0?'disabled':''}>Previous</button><input id="case-page" class="input page-input" type="number" min="1" max="${Math.max(1,Math.ceil(live.total/live.pageSize))}" value="${live.page+1}" aria-label="Page number"/><button id="cases-go" class="tab">Go</button><button id="cases-next" class="tab" ${live.complete?'disabled':''}>Next</button></div></div><div class="toolbar registry-tools"><input id="direct-case-id" class="input" placeholder="Exact case ID (including another page)" aria-label="Find exact case ID"/><button id="direct-case-search" class="tab">Open exact ID</button></div>`,'Paged canonical registry · each detail is read from finalized Studionet state');
  if(['Evidence','Policies'].includes(name)) return progress()+panel(name==='Evidence'?'Attested evidence registry':'Frozen policies',safeEmpty+(cases.length?`<div class="case-list">${cases.map(r=>`<div class="case-row" role="button" tabindex="0" data-live-case="${esc(r.id)}"><b>${esc(r.id)}</b><span><b>${esc(name==='Evidence'?(r.evidence_hash||'No locked evidence'):(r.rule_hash||'Unfrozen rule'))}</b><small class="desc">Source ${esc(r.source_ref||'No attested source')} · Attestor ${esc(shorten(r.attestor))}</small></span>${badge(r)}<small>${esc(r.attested?'Attested':'Not attested')}</small></div>`).join('')}</div>`:renderCases([])),`Only contract-recorded ${name.toLowerCase()}`)+`<div class="toolbar" style="margin-top:16px">${refreshButton}</div>`;
  if(name==='Challenges') return progress()+panel('Challenge ledger',safeEmpty+(cases.filter(r=>(r.challenges||[]).length>0).length?`<div class="case-list">${cases.filter(r=>(r.challenges||[]).length>0).map(r=>`<div class="case-row" role="button" tabindex="0" data-live-case="${esc(r.id)}"><b>${esc(r.id)}</b><span><b>${esc((r.challenges||[]).length)} submitted challenge(s)</b><small class="desc">Immutable challenge hash ${esc(r.challenge_hash||'')}</small></span>${badge(r)}</div>`).join('')}</div>`:'<div class="blank">No submitted challenge records yet.</div>'),'Two parties have separate challenge slots')+`<div class="toolbar" style="margin-top:16px">${refreshButton}</div>`;
  if(name==='Audit') return progress()+panel('Append-only consensus lineage',safeEmpty+(cases.length?`<div class="case-list">${cases.map(r=>`<div class="case-row" role="button" tabindex="0" data-live-case="${esc(r.id)}"><b>${esc(r.id)}</b><span><b>${esc(r.round||0)} assessment round(s)</b><small class="desc">Finalized: ${esc(r.finalized_at||'not yet')} · Decision ${esc(r.result||'pending')}</small></span>${badge(r)}</div>`).join('')}</div>`:'<div class="blank">No contract cases available for audit.</div>'),'Select a real case to load its entire hash-linked history');
  if(name==='Schedule') return progress()+panel('Actual shift claims',safeEmpty+(cases.length?`<div class="case-list">${cases.map(r=>`<div class="case-row" role="button" tabindex="0" data-live-case="${esc(r.id)}"><b>${esc(r.id)}</b><span><b>${esc(r.requested_minutes??0)} requested minutes</b><small class="desc">Provisional ${esc(r.provisional_approved_minutes??0)} · Final ${esc(r.approved_minutes??0)} min</small></span>${badge(r)}</div>`).join('')}</div>`:'<div class="blank">No shift cases exist on this contract.</div>'),'No synthetic roster or employee data');
  if(name==='Network') return panel('GenLayer network and wallet',`<div class="detail"><div class="detail-box"><div class="eyebrow">RPC ENDPOINT</div><div class="mono">https://studio.genlayer.com/api</div><div id="rpc-status">Click Recheck to probe chain ID.</div></div><div class="detail-box"><div class="eyebrow">EXPECTED CHAIN ID</div><h2>${CHAIN_ID} / 0xF22F</h2><p class="mono">${esc(ADDRESS)}</p><small>${esc(live.checkedAt||'Not checked')}</small></div><div class="toolbar">${refreshButton}<button id="probe-button" class="tab">Recheck network</button><button id="open-onchain" class="cta">Open on-chain wallet workspace</button></div></div>`,'Studionet 61999');
  return progress()+panel('Actual contract data',safeEmpty+renderCases(cases));
}
async function refresh(requestedPage=live.page){
  if(!validContract){live.error='The contract address is not configured.';live.loading=false;nav(page,false);return}
  const generation=++refreshGeneration;
  const cancelled=()=>shouldCancelRegistryRead(generation,refreshGeneration,page);
  live.loading=true;live.error='';nav(page,false);
  try{
    const info=parsed(await read('contract_info'));
    if(cancelled())return;
    const total=Number(info?.case_count);
    if(!Number.isSafeInteger(total)||total<0)throw new Error('Contract did not return a valid canonical case count');
    const pageSize=CASE_REGISTRY_PAGE_SIZE, pageCount=Math.max(1,Math.ceil(total/pageSize));
    const targetPage=Math.min(Math.max(0,requestedPage),pageCount-1);
    const ids=parsed(await read('get_case_ids_page',[targetPage*pageSize,pageSize]));
    if(cancelled())return;
    if(!Array.isArray(ids)||ids.length>pageSize||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw new Error('Unexpected or duplicate case page returned by contract');
    const results=[];
    for(const id of ids){
      if(cancelled())return;
      const rec=parsed(await read('get_case',[id]));
      if(cancelled())return;
      if(!rec||typeof rec!=='object'||rec.id!==id)throw new Error('Canonical case ID mismatch: '+id);
      results.push(rec);
    }
    live={cases:results,ids,total,page:targetPage,pageSize,loading:false,error:'',checkedAt:new Date().toLocaleString(),complete:(targetPage+1)*pageSize>=total};
  }catch(e){if(cancelled())return;live.loading=false;live.error=String(e?.shortMessage||e?.message||e).slice(0,350)}
  // A registry read may finish while the user is signing on the separate
  // on-chain workspace. Do not replace its live form or receipt view.
  if(page!=='On-chain')nav(page,false);
}
function nav(name,doRefresh=true){
  if(name==='On-chain'){refreshGeneration++;live.loading=false;}
  page=name;
  document.querySelectorAll('nav button').forEach(e=>e.classList.toggle('active',e.dataset.page===name));
  $('page-name').textContent=name;
  if ($('hero-area')) {
    $('hero-area').style.display = name === 'Overview' ? 'none' : 'flex';
  }
  $('hero-title').textContent=name==='Overview'?APP.tagline:name;
  $('hero-subtitle').textContent=name==='Overview'?APP.subtitle:'Actual contract state and accountable evidence';
  $('main-content').innerHTML=render(name);
  bind();
  if (name === 'Overview') {
    if (location.pathname.startsWith('/app')) history.pushState({}, '', '/');
    history.replaceState({}, '', '#' + encodeURIComponent(name.toLowerCase()));
  } else {
    if (!location.pathname.startsWith('/app')) history.pushState({}, '', '/app');
    history.replaceState({}, '', '/app#' + encodeURIComponent(name.toLowerCase()));
  }
  if(doRefresh&&name!=='On-chain'&&!live.checkedAt&&!live.loading)void refresh();
}
async function detail(id){
  $('modal-body').innerHTML='<div class="blank">Fetching authentic contract history…</div>';
  $('detail-modal').hidden=false;
  try{
    const record=parsed(await read('get_case',[id]));
    const history=parsed(await read('get_history',[id]));
    if(!Array.isArray(history))throw new Error('Unexpected history response');
    if(!record||record.id!==id)throw new Error('Canonical case ID mismatch');
    const integrity=await verifyAuditHistory(history);
    const a=esc;
    $('modal-body').innerHTML=`<div class="eyebrow">ON-CHAIN CASE / ${a(id)}</div>
      <h2>${a(record.status||'UNKNOWN')}</h2>
      ${renderRoleBanner(record)}
      ${renderLifecycleStepper(record.status)}
      <div class="detail">
        <div class="detail-box"><div class="eyebrow">FROZEN POLICY</div><p>${a(record.rule||'Not frozen')}</p><p class="mono">${a(record.rule_hash||'No frozen hash')}</p></div>
        <div class="detail-box"><div class="eyebrow">AUTHORITIES</div><p>Creator: ${a(record.creator)}</p><p>Counterparty: ${a(record.recipient)}</p><p>Attestor: ${a(record.attestor)}</p><p>Consent: ${a(record.consented?'Yes':'No')}</p></div>
        <div class="detail-box"><div class="eyebrow">EVIDENCE</div><p>${a(record.evidence||'No evidence')}</p><p class="mono">${a(record.evidence_hash||'No digest')}</p><small>Source: ${a(record.source_ref||'Not attested')}</small></div>
        <div class="detail-box"><div class="eyebrow">DECISION</div><p>Verdict: ${a(record.result||'Not assessed')}</p><p>Round: ${a(record.round||0)}</p><p>Finalized: ${a(record.finalized_at||'No')}</p><p>Challenges: ${a((record.challenges||[]).length)}</p></div>
      </div>
      ${renderConsensusMatrix(record, history)}
      <div class="surface" style="margin-top:14px">
        <div class="section-head"><h2>Canonical history</h2><span class="hint">${history.length} entries · ${integrity.valid?'hash links verified':'INTEGRITY FAILURE at entry '+integrity.at}</span></div>
        <pre class="mono" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:280px;overflow:auto">${a(stringify(history))}</pre>
      </div>
      <p class="footnote">History integrity: ${integrity.valid?'all SHA-256 entry links verified':'FAILED; do not rely on this audit view'}. A designated on-chain attestor proves wallet control, not independently verified identity or real-world document truth. Source SHA-256: ${esc(window.CONTRACT_SOURCE_SHA256||'unavailable')}.</p>`;
    
    $('modal-connect-wallet')?.addEventListener('click', async () => {
      try {
        await connectGlobalWallet();
        detail(id);
      } catch (err) {
        alert(err?.message || 'Connection failed');
      }
    });

    $('modal-quick-action')?.addEventListener('click', (e) => {
      const act = e.currentTarget.dataset.action;
      const cId = e.currentTarget.dataset.case;
      $('detail-modal').hidden = true;
      nav('On-chain');
      setTimeout(() => {
        if ($('chain-case-id')) $('chain-case-id').value = cId;
        if ($('chain-action')) $('chain-action').value = act;
      }, 50);
    });
  }catch(e){$('modal-body').textContent='Contract case read failed: '+String(e?.message||e)}
}
async function probe(){
  const e=$('rpc-status');if(e)e.textContent='Checking Studionet RPC…';
  try{const r=await fetch('https://studio.genlayer.com/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',params:[],id:1})});const q=await r.json();const actual=parseInt(q.result,16);if(e)e.textContent=actual===CHAIN_ID?'Verified chain ID 61999':'Unexpected chain ID: '+actual}catch(err){if(e)e.textContent='Network check failed: '+String(err.message||err)}
}
function bind(){
  if(page==='On-chain'){chainUI.bind();return}
  document.querySelectorAll('[data-live-case]').forEach(n=>{const action=()=>void detail(n.dataset.liveCase);n.addEventListener('click',action);n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}})});
  $('live-refresh')?.addEventListener('click',()=>void refresh(live.page));
  $('cases-prev')?.addEventListener('click',()=>void refresh(Math.max(0,live.page-1)));
  $('cases-next')?.addEventListener('click',()=>void refresh(live.page+1));
  $('cases-go')?.addEventListener('click',()=>{const n=Number($('case-page')?.value);if(Number.isInteger(n)&&n>=1)void refresh(n-1)});
  $('direct-case-search')?.addEventListener('click',()=>{const id=String($('direct-case-id')?.value||'').trim();if(id)void detail(id)});
  $('open-onchain')?.addEventListener('click',()=>nav('On-chain'));
  $('probe-button')?.addEventListener('click',()=>void probe());
  $('case-filter')?.addEventListener('input',e=>{activeSearch=e.target.value;const filtered=live.cases.filter(r=>(r.id+' '+r.status+' '+r.rule).toLowerCase().includes(activeSearch.toLowerCase()));$('filtered-cases').innerHTML=renderCases(filtered);document.querySelectorAll('#filtered-cases [data-live-case]').forEach(n=>n.addEventListener('click',()=>void detail(n.dataset.liveCase)))});

  // Framer / Sawad Landing Page CTA bindings
  $('sawad-card-orange-trigger')?.addEventListener('click', () => nav('On-chain'));
  $('sawad-card-lime-trigger')?.addEventListener('click', () => nav('Cases'));
  $('sawad-float-launch')?.addEventListener('click', () => nav('On-chain'));
  $('landing-launch-workspace')?.addEventListener('click', () => nav('On-chain'));
  $('landing-cta-launch')?.addEventListener('click', () => nav('On-chain'));
  $('landing-view-all-cases')?.addEventListener('click', () => nav('Cases'));
  $('landing-cta-view-registry')?.addEventListener('click', () => nav('Cases'));
  const triggerWallet = async () => {
    const ws = getWalletState();
    if (!ws.address) {
      try {
        await connectGlobalWallet();
      } catch (err) {
        alert(err?.message || 'Connection failed');
      }
    } else {
      openWalletModal();
    }
  };
  $('sawad-float-wallet')?.addEventListener('click', triggerWallet);
  $('landing-wallet-trigger')?.addEventListener('click', triggerWallet);
  $('landing-cta-connect')?.addEventListener('click', triggerWallet);
}
document.querySelectorAll('nav button').forEach(e=>e.addEventListener('click',()=>nav(e.dataset.page)));
$('primary-action')?.addEventListener('click',()=>nav('On-chain'));
$('close-unavailable')?.addEventListener('click',()=>{$('unavailable-modal').hidden=true});
$('close-detail')?.addEventListener('click',()=>{$('detail-modal').hidden=true});
$('close-wallet-modal')?.addEventListener('click',()=>{$('wallet-modal').hidden=true});
$('global-wallet-btn')?.addEventListener('click', async () => {
  const ws = getWalletState();
  if (!ws.address) {
    try {
      await connectGlobalWallet();
    } catch (err) {
      alert(err?.message || 'Connection failed');
    }
  } else {
    openWalletModal();
  }
});
const fromHash=decodeURIComponent(location.hash.slice(1)).toLowerCase();
const isAppPath = location.pathname.startsWith('/app');
if (isAppPath) {
  nav([...APP.view, 'On-chain'].find(x => x.toLowerCase() === fromHash) || 'Cases');
} else {
  nav([...APP.view, 'On-chain'].find(x => x.toLowerCase() === fromHash) || 'Overview');
}

window.addEventListener('popstate', () => {
  if (location.pathname.startsWith('/app')) {
    if (page === 'Overview') nav('Cases', false);
  } else {
    if (page !== 'Overview') nav('Overview', false);
  }
});
