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
    <div class="landing-container">
      <!-- Sawad / Framer Style Hero -->
      <section class="landing-hero">
        <div class="hero-badge">
          <span class="signal-dot connected"></span>
          <span>GenLayer Intelligent Contract · Studionet 61999</span>
        </div>
        <h1 class="hero-title">
          Adversarial delivery & dispute resolution <em>powered by GenVM AI consensus</em>
        </h1>
        <p class="hero-desc">
          An immutable multi-party arbitration ledger on GenLayer. Freeze service policies, commit cryptographic delivery evidence, and invoke non-deterministic LLM validator consensus with hash-linked finality.
        </p>
        <div class="hero-cta-group">
          <button class="hero-cta-primary" id="landing-launch-workspace">
            Open Case Workspace →
          </button>
          <button class="hero-cta-secondary" id="landing-wallet-trigger">
            Connect Web3 Wallet
          </button>
          <button class="hero-cta-secondary" id="landing-view-all-cases">
            View Live Registry (${counts.total})
          </button>
          <a class="hero-cta-link" href="https://explorer-studio.genlayer.com/address/${esc(ADDRESS)}" target="_blank" rel="noopener noreferrer">
            Verified Contract ↗
          </a>
        </div>
      </section>

      <!-- Bento Grid System -->
      <div class="bento-grid">
        <div class="bento-card bento-col-4 bento-card-glow">
          <div class="bento-header">
            <span class="eyebrow">CANONICAL STATE</span>
            <div class="bento-icon">⬡</div>
          </div>
          <div>
            <div class="bento-val">${counts.total}</div>
            <div class="bento-label">Recorded Cases</div>
          </div>
          <p class="bento-desc">Live on-chain delivery agreements stored immutably on Studionet storage slots.</p>
        </div>

        <div class="bento-card bento-col-4 bento-card-glow">
          <div class="bento-header">
            <span class="eyebrow">ACTIVE EVIDENCE</span>
            <div class="bento-icon">⚡</div>
          </div>
          <div>
            <div class="bento-val">${counts.frozen}</div>
            <div class="bento-label">Evidence Workflows</div>
          </div>
          <p class="bento-desc">Cases with frozen delivery conditions, counterparty consents, or attested manifests.</p>
        </div>

        <div class="bento-card bento-col-4 bento-card-glow">
          <div class="bento-header">
            <span class="eyebrow">GENVM ROUNDS</span>
            <div class="bento-icon">◈</div>
          </div>
          <div>
            <div class="bento-val">${counts.assessed}</div>
            <div class="bento-label">Consensus Assessed</div>
          </div>
          <p class="bento-desc">AI validator evaluations conducted under non-deterministic consensus principles.</p>
        </div>

        <!-- Bento Row 2: Architecture & Live Specimen -->
        <div class="bento-card bento-col-7">
          <div class="bento-header">
            <span class="eyebrow">ADVERSARIAL MULTI-PARTY PROTOCOL</span>
            <span class="pill" style="background:#6affd822;color:#6affd8">Role Enforced</span>
          </div>
          <div>
            <h3 style="font-size:22px;margin:0 0 8px;letter-spacing:-.03em">Zero Trust Handoff Protocol</h3>
            <p class="bento-desc">Every delivery requires explicit consent, immutable policy locking, courier proof attestation, and transparent AI consensus before fund execution.</p>
          </div>
          <div class="specimen-grid">
            <div class="specimen-item">
              <span>01. Creator</span>
              <strong>Originating Merchant</strong>
              <small>Deploys policy & stakes bounty</small>
            </div>
            <div class="specimen-item">
              <span>02. Counterparty</span>
              <strong>Consenting Recipient</strong>
              <small>Explicitly locks agreement</small>
            </div>
            <div class="specimen-item">
              <span>03. Attestor</span>
              <strong>Designated Courier</strong>
              <small>Commits cryptographic manifest</small>
            </div>
            <div class="specimen-item">
              <span>04. GenVM Validators</span>
              <strong>AI Consensus Nodes</strong>
              <small>Evaluate prompt compliance</small>
            </div>
          </div>
        </div>

        <div class="bento-card bento-col-5">
          <div class="bento-header">
            <span class="eyebrow">CONTRACT TELEMETRY</span>
            <span class="pill" style="background:#ffffff15;color:#ffffff">Studionet 61999</span>
          </div>
          <div>
            <h3 style="font-size:20px;margin:0 0 10px;letter-spacing:-.03em">Verified Intelligent Contract</h3>
            <p class="bento-desc">Python-powered smart contract deployed on GenLayer Studionet with deterministic hash verification.</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;background:color-mix(in srgb,var(--back) 60%,transparent);border:1px solid var(--border);border-radius:12px;padding:16px">
            <div style="display:flex;justify-content:space-between;font-size:11px">
              <span class="muted">Contract:</span>
              <span class="mono" style="font-weight:700;color:var(--accent)">${shorten(ADDRESS)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px">
              <span class="muted">Chain ID:</span>
              <span class="mono">61999 (0xF22F)</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px">
              <span class="muted">RPC:</span>
              <span class="mono">studio.genlayer.com/api</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px">
              <span class="muted">Source Hash:</span>
              <span class="mono">${(window.CONTRACT_SOURCE_SHA256||'302a0db3').slice(0, 16)}…</span>
            </div>
          </div>
        </div>

        <!-- Bento Row 3: 4 Step Pipeline -->
        <div class="bento-card bento-col-3">
          <div class="pipeline-step-badge">Phase 01</div>
          <h4 style="margin:0 0 8px;font-size:16px">Freeze Policy</h4>
          <p class="bento-desc">Contract rules, timeline constraints, and delivery parameters are immutably hashed and frozen into contract storage.</p>
        </div>

        <div class="bento-card bento-col-3">
          <div class="pipeline-step-badge">Phase 02</div>
          <h4 style="margin:0 0 8px;font-size:16px">Attest Evidence</h4>
          <p class="bento-desc">Designated courier commits authenticated delivery logs, photo SHA-256 hashes, and GPS location timestamps.</p>
        </div>

        <div class="bento-card bento-col-3">
          <div class="pipeline-step-badge">Phase 03</div>
          <h4 style="margin:0 0 8px;font-size:16px">GenVM Consensus</h4>
          <p class="bento-desc">Decentralized validators execute non-deterministic LLM principle prompts to render comparative verdict agreements.</p>
        </div>

        <div class="bento-card bento-col-3">
          <div class="pipeline-step-badge">Phase 04</div>
          <h4 style="margin:0 0 8px;font-size:16px">Challenge Window</h4>
          <p class="bento-desc">Parties hold a dispute grace period before state finalization triggers automated escrow distribution.</p>
        </div>

        <!-- Bento Row 4: Recent Real Cases on Chain -->
        <div class="bento-card bento-col-12">
          <div class="bento-header">
            <div>
              <span class="eyebrow">STUDIONET CANONICAL LEDGER</span>
              <h3 style="font-size:20px;margin:4px 0 0">Recent Verified Contract Cases</h3>
            </div>
            <button class="cta" id="landing-cta-view-registry">Explore All ${counts.total} Cases →</button>
          </div>
          ${safeEmpty}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:10px">
            ${recentCases.length ? recentCases.map(c => `
              <div class="recent-case-card" role="button" tabindex="0" data-live-case="${esc(c.id)}">
                <div class="case-card-head">
                  <span class="mono" style="font-weight:800;color:var(--accent)">${esc(c.id)}</span>
                  ${badge(c)}
                </div>
                <div class="case-card-rule">${esc(c.rule ? (c.rule.slice(0, 95) + (c.rule.length > 95 ? '…' : '')) : 'Standard handoff policy')}</div>
                <div class="case-card-meta">
                  <span>Attestor: <span class="mono">${esc(shorten(c.attestor))}</span></span>
                  <span>Rounds: ${esc(c.round || 0)}</span>
                </div>
              </div>
            `).join('') : '<div class="blank">No live cases recorded yet. Deploy your first case via the On-Chain workspace.</div>'}
          </div>
        </div>

        <!-- Bento Row 5: Framer Bottom CTA Box -->
        <div class="bento-col-12">
          <div class="framer-cta-card">
            <div>
              <h2>Start Arbitrating On GenLayer</h2>
              <p>Connect your wallet to sign multi-party transactions, deploy contract instances, or submit cryptographically signed delivery attestations.</p>
            </div>
            <div style="display:flex;gap:14px;flex-wrap:wrap">
              <button class="hero-cta-primary" id="landing-cta-launch">Launch Workspace</button>
              <button class="hero-cta-secondary" id="landing-cta-connect">Connect Wallet</button>
            </div>
          </div>
        </div>
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
  history.replaceState({},'', '#'+encodeURIComponent(name.toLowerCase()));
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
nav([...APP.view,'On-chain'].find(x=>x.toLowerCase()===fromHash)||'Overview');
