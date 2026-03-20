/* ========================================
   kennyy Dashboard – Full API Integration
======================================== */

const APP_BASE = window.location.pathname.startsWith('/player') ? '/player' : '';
const API_BASE = `${APP_BASE}/api`;
const CLIENT_ID = '920133124095098881';
const REDIRECT_URI = 'https://kennyy.com.br/player/';
const OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify+guilds`;

// Detecta se está rodando dentro do iframe do Discord Activity
// Usa múltiplos métodos: hostname do proxy do Discord + comparação de janela
const IS_DISCORD_ACTIVITY = (
  window.location.hostname.endsWith('.discordsays.com') ||
  (function() { try { return window.self !== window.top; } catch(e) { return true; } })()
);

// ── State ──
let token = localStorage.getItem('kennyy_token');
let user = null;
let guilds = [];
let currentGuildId = null;
let currentVoiceChannelId = null;
let botVoiceChannelId = null; // voice channel the bot is currently occupying
let playerState = { active: false };
let queueData = { current: null, tracks: [], length: 0 };
let pollInterval = null;
let searchTimeout = null;
let isSeeking = false;

// Playlist state
let userPlaylists = [];
let currentEditPlaylistId = null;
let viewingPlaylistId = null;
let pendingTrackForNewPlaylist = null;

// Context menu state
let ctxTarget = null; // { track, playlistId?, trackIndex? }

// ── Toast Notifications ──
const TOAST_ICONS = {
  success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f53f5f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f53f5f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f53f5f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  warn:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f53f5f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
};

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── DOM refs ──
const $ = (s) => document.querySelector(s);
const loginScreen = $('#login-screen');
const app = $('#app');
const btnLogin = $('#btn-login');
const guildActiveSection = $('#guild-active-section');
const guildActiveList = $('#guild-active-list');
const guildOtherSection = $('#guild-other-section');
const btnToggleServers = $('#btn-toggle-servers');
const guildOtherList = $('#guild-other-list');
const userAvatar = $('#user-avatar');
const userName = $('#user-name');
const btnLogout = $('#btn-logout');
const searchInput = $('#search-input');
const searchResults = $('#search-results');
const queueList = $('#queue-list');
const npThumb = $('#np-thumb');
const npThumbPlaceholder = $('#np-thumb-placeholder');
const npTitle = $('#np-title');
const npAuthor = $('#np-author');
const npTimeCurrent = $('#np-time-current');
const npTimeTotal = $('#np-time-total');
const npProgressBar = $('#np-progress-bar');
const npProgressFill = $('#np-progress-fill');
const btnPause = $('#btn-pause');
const iconPause = $('#icon-pause');
const iconPlay = $('#icon-play');
const btnSkip = $('#btn-skip');
const btnStop = $('#btn-stop');
const btnLoop = $('#btn-loop');
const loopBadge = $('#loop-badge');
const btnLyrics = $('#btn-lyrics');
const btnVolume = $('#btn-volume');
const volumeDropdown = $('#volume-dropdown');
const nowPlaying = $('#now-playing');
const playlistModal = $('#playlist-modal');
const playlistThumb = $('#playlist-thumb');
const playlistName = $('#playlist-name');
const playlistCount = $('#playlist-count');
const playlistConfirm = $('#playlist-confirm');
const playlistCancel = $('#playlist-cancel');
const vcModal = $('#vc-modal');
const vcList = $('#vc-list');
const vcModalClose = $('#vc-modal-close');
const lyricsPanel = $('#lyrics-panel');
const lyricsThumb = $('#lyrics-thumb');
const lyricsTitle = $('#lyrics-title');
const lyricsArtist = $('#lyrics-artist');
const lyricsBody = $('#lyrics-body');
const lyricsSource = $('#lyrics-source');
const lyricsClose = $('#lyrics-close');
const btnSidebarToggle = $('#btn-sidebar-toggle');
const sidebarOverlay = $('#sidebar-overlay');
const sidebar = $('.sidebar');

// ── Mobile Player DOM refs ──
const mobilePlayer = $('#mobile-player');
const mpClose = $('#mp-close');
const mpQueueToggle = $('#mp-queue-toggle');
const mpHeaderLabel = $('#mp-header-label');
const mpNpView = $('#mp-np-view');
const mpQueueView = $('#mp-queue-view');
const mpThumb = $('#mp-thumb');
const mpThumbPh = $('#mp-thumb-ph');
const mpTitle = $('#mp-title');
const mpAuthor = $('#mp-author');
const mpTimeCur = $('#mp-time-cur');
const mpTimeTot = $('#mp-time-tot');
const mpProgressBar = $('#mp-progress-bar');
const mpProgressFill = $('#mp-progress-fill');
const mpPause = $('#mp-pause');
const mpIconPause = $('#mp-icon-pause');
const mpIconPlay = $('#mp-icon-play');
const mpSkip = $('#mp-skip');
const mpStop = $('#mp-stop');
const mpLoop = $('#mp-loop');
const mpLoopBadge = $('#mp-loop-badge');
const mpLyricsBtn = $('#mp-lyrics-btn');
const mpVolBtn = $('#mp-vol-btn');
const mpVolPicker = $('#mp-vol-picker');
const mpQueueList = $('#mp-queue-list');
const npMiniPause = $('#np-mini-pause');
const npMiniSkip = $('#np-mini-skip');
const npMiniFill = $('#np-mini-fill');
const npMiniIconPause = $('#np-mini-icon-pause');
const npMiniIconPlay = $('#np-mini-icon-play');

// Playlist UI refs
const plEditModal = $('#pl-edit-modal');
const plEditTitle = $('#pl-edit-title');
const plEditName = $('#pl-edit-name');
const plEditImage = $('#pl-edit-image');
const plImportUrl = $('#pl-import-url');
const plImportBtn = $('#pl-import-btn');
const plImportStatus = $('#pl-import-status');
const plEditCancel = $('#pl-edit-cancel');
const plEditSave = $('#pl-edit-save');
const btnCreatePlaylist = $('#btn-create-playlist');
const userPlaylistList = $('#user-playlist-list');

// Playlist inline view refs
const queueView = $('#queue-view');
const playlistView = $('#playlist-view');
const pvBack = $('#pv-back');
const pvThumb = $('#pv-thumb');
const pvThumbPlaceholder = $('#pv-thumb-placeholder');
const pvName = $('#pv-name');
const pvCount = $('#pv-count');
const pvTracks = $('#pv-tracks');
const pvPlay = $('#pv-play');
const pvShuffle = $('#pv-shuffle');
const pvEdit = $('#pv-edit');
const pvExport = $('#pv-export');
const pvDelete = $('#pv-delete');
const pvLoading = $('#pv-loading');
const pvLoadingText = $('#pv-loading-text');

// Context menu refs
const contextMenu = $('#context-menu');
const ctxAddQueue = $('#ctx-add-queue');
const ctxAddPlaylist = $('#ctx-add-playlist');
const ctxPlaylistSub = $('#ctx-playlist-sub');
const ctxRemovePlaylist = $('#ctx-remove-playlist');
const ctxSeparatorQueue = $('#ctx-separator-queue');
const ctxPlayNext = $('#ctx-play-next');
const ctxSkipTo = $('#ctx-skip-to');
const ctxRemoveQueue = $('#ctx-remove-queue');

// ── API Helper ──
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) { logout(); return null; }
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

function proxifyImageUrl(url) {
  if (!url) return '';

  try {
    const parsed = new URL(url, window.location.origin);
    const isExternal = parsed.origin !== window.location.origin;

    if (!IS_DISCORD_ACTIVITY || !isExternal) {
      return parsed.toString();
    }

    return `${API_BASE}/assets/image?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
  }
}

// ── Discord Activity Auth ──
async function ensureDiscordSdkLoaded() {
  if (window.DiscordSDKLib?.DiscordSDK) return;

  const candidates = [
    'discord-sdk.js',
    '/discord-sdk.js',
    '/player/discord-sdk.js'
  ];

  for (const src of candidates) {
    try {
      await new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = src;
        tag.async = false;
        tag.onload = resolve;
        tag.onerror = () => reject(new Error(`failed: ${src}`));
        document.head.appendChild(tag);
      });

      if (window.DiscordSDKLib?.DiscordSDK) {
        return;
      }
    } catch {
      // fallback: tenta o próximo caminho
    }
  }

  throw new Error('DiscordSDKLib não encontrado em nenhum caminho de fallback');
}

async function initDiscordActivity() {
  await ensureDiscordSdkLoaded();

  // SDK carregado via <script> no HTML como IIFE (window.DiscordSDKLib)
  const DiscordSDK = window.DiscordSDKLib?.DiscordSDK;
  if (!DiscordSDK) throw new Error('DiscordSDKLib não encontrado');

  const discordSdk = new DiscordSDK(CLIENT_ID);

  // Aguarda o cliente Discord estar pronto
  await discordSdk.ready();

  // Pede ao Discord para autorizar e obter o code
  // NOTA: redirect_uri NÃO deve ser passado aqui — o SDK gerencia isso internamente
  const { code } = await discordSdk.commands.authorize({
    client_id: CLIENT_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  // Troca o code por um JWT no nosso backend
  // O backend usa API_DISCORD_ACTIVITY_REDIRECT_URI = https://<APP_ID>.discordsays.com
  const res = await fetch(`${API_BASE}/auth/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!data?.token) {
    const detail = data?.details ? ` | ${data.details}` : '';
    throw new Error(`Activity auth failed: ${data?.error || 'no token'}${detail}`);
  }

  token = data.token;
  localStorage.setItem('kennyy_token', token);
  user = data.user;

  // Guarda o SDK para uso futuro (eventos de voz, etc.)
  window._discordSdk = discordSdk;
}

// ── OAuth2 ──
function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return false;

  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);

  // Exchange code
  api('/auth/callback', {
    method: 'POST',
    body: JSON.stringify({ code })
  }).then(data => {
    if (data?.token) {
      token = data.token;
      localStorage.setItem('kennyy_token', token);
      user = data.user;
      init();
    }
  }).catch(err => {
    console.error('OAuth error:', err);
    showLogin();
  });

  return true;
}

// ── Init ──
async function init() {
  if (!token) { showLogin(); return; }
  try {
    const meRes = await api('/auth/me');
    if (!meRes) return;
    user = meRes.user;
    setupApp();
  } catch {
    logout();
  }
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  app.classList.add('hidden');
}

function setupApp() {
  loginScreen.classList.add('hidden');
  app.classList.remove('hidden');

  // User info
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;
  userAvatar.src = proxifyImageUrl(avatarUrl);
  userName.textContent = user.globalName || user.username;

  // Restore collapsed servers state
  const serversCollapsed = localStorage.getItem('kennyy_servers_collapsed') === 'true';
  if (serversCollapsed) {
    guildOtherSection.classList.add('collapsed');
  }

  // Mobile sidebar toggle
  if (btnSidebarToggle) {
    btnSidebarToggle.onclick = () => {
      if (sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    };
  }
  if (sidebarOverlay) {
    sidebarOverlay.onclick = closeMobileSidebar;
  }

  // Mobile player init
  initMobileProgressBar();

  loadGuilds();
  loadUserPlaylists();
}

async function loadGuilds() {
  try {
    const data = await api('/guilds');
    guilds = data.guilds || [];
    renderGuilds();
    // Auto-select: prefer guild where user is in a voice channel, then active player, then first
    const inVoice = guilds.find(g => g.userVoiceChannelId);
    const active = inVoice || guilds.find(g => g.hasPlayer) || guilds[0];
    if (active) selectGuild(active.id);
  } catch (err) {
    console.error('Failed to load guilds:', err);
  }
}

function renderGuilds() {
  guildActiveList.innerHTML = '';
  guildOtherList.innerHTML = '';

  const voiceGuilds = guilds.filter(g => g.userVoiceChannelId);
  const otherGuilds = guilds.filter(g => !g.userVoiceChannelId);

  // Show/hide sections
  guildActiveSection.classList.toggle('hidden', voiceGuilds.length === 0);
  guildOtherSection.classList.toggle('hidden', otherGuilds.length === 0);

  for (const g of voiceGuilds) {
    guildActiveList.appendChild(createGuildItem(g, true));
  }
  for (const g of otherGuilds) {
    guildOtherList.appendChild(createGuildItem(g, false));
  }
}

function createGuildItem(g, inVoice) {
  const el = document.createElement('div');
  el.className = `guild-item${g.id === currentGuildId ? ' active' : ''}${inVoice ? ' in-voice' : ''}`;
  el.dataset.id = g.id;

  const voiceIcon = inVoice
    ? `<svg class="guild-voice-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
    : '';

  if (g.icon) {
    el.innerHTML = `<img class="guild-icon" src="${sanitize(g.icon)}" alt=""><span>${sanitize(g.name)}</span>${voiceIcon}`;
  } else {
    const initials = g.name.split(' ').map(w => w[0]).join('').slice(0, 2);
    el.innerHTML = `<div class="guild-icon-placeholder">${sanitize(initials)}</div><span>${sanitize(g.name)}</span>${voiceIcon}`;
  }
  el.onclick = () => selectGuild(g.id);
  return el;
}

function openMobileSidebar() {
  sidebar.classList.add('mobile-open');
  sidebarOverlay.classList.add('active');
}
function closeMobileSidebar() {
  sidebar.classList.remove('mobile-open');
  sidebarOverlay.classList.remove('active');
}

async function selectGuild(guildId) {
  currentGuildId = guildId;
  currentVoiceChannelId = null;
  closeMobileSidebar();

  // Update active state
  document.querySelectorAll('.guild-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === guildId);
  });

  // Get guild details to find voice channels
  try {
    const guildDetail = await api(`/guilds/${guildId}`);
    if (guildDetail?.voiceChannels?.length) {
      // Only auto-select if user is actually in a voice channel
      const userVc = guildDetail.voiceChannels.find(vc =>
        vc.members.some(m => m.id === user.id)
      );
      if (userVc) {
        currentVoiceChannelId = userVc.id;
      }
      // Store for modal use
      window._voiceChannels = guildDetail.voiceChannels;
    }
  } catch {}

  // Start polling
  startPolling();
  await refreshState();
}

// ── Polling ──
function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(refreshState, 2000);
}

async function refreshState() {
  if (!currentGuildId) return;
  try {
    const [pState, qData, guildDetail] = await Promise.all([
      api(`/player/${currentGuildId}`),
      api(`/queue/${currentGuildId}`),
      api(`/guilds/${currentGuildId}`)
    ]);
    playerState = pState || { active: false };
    queueData = qData || { current: null, tracks: [], length: 0 };

    // Track where the bot currently is
    botVoiceChannelId = playerState.voiceId || null;

    // Keep voice channel state up-to-date
    if (guildDetail?.voiceChannels?.length) {
      window._voiceChannels = guildDetail.voiceChannels;
      const userVc = guildDetail.voiceChannels.find(vc =>
        vc.members.some(m => m.id === user.id)
      );
      const newVcId = userVc ? userVc.id : null;
      // Re-render guild sections if voice state changed
      if (newVcId !== currentVoiceChannelId) {
        currentVoiceChannelId = newVcId;
        const g = guilds.find(x => x.id === currentGuildId);
        if (g) g.userVoiceChannelId = newVcId;
        renderGuilds();
      } else {
        currentVoiceChannelId = newVcId;
      }
    } else {
      if (currentVoiceChannelId !== null) {
        currentVoiceChannelId = null;
        const g = guilds.find(x => x.id === currentGuildId);
        if (g) g.userVoiceChannelId = null;
        renderGuilds();
      }
      currentVoiceChannelId = null;
    }

    renderQueue();
    renderNowPlaying();

    // Refresh permissions panel if it's open
    if (permissionsOpen) {
      await loadPermissions();
      renderPermissionsPanel();
    }
  } catch {}
}

// ── Queue Rendering ──
let dragSrcIndex = null;

/** True when the user is in a VC but it's different from the bot's VC. */
function isWrongChannel() {
  return playerState.active &&
    botVoiceChannelId &&
    currentVoiceChannelId &&
    currentVoiceChannelId !== botVoiceChannelId;
}

/** Returns the bot's current channel name, looked up from _voiceChannels. */
function getBotChannelName() {
  const vcs = window._voiceChannels || [];
  const ch = vcs.find(c => c.id === botVoiceChannelId);
  return ch ? ch.name : 'another channel';
}

function renderQueue() {
  // If the bot is playing in a different channel, show lock notice
  if (isWrongChannel()) {
    const botChName = getBotChannelName();
    queueList.innerHTML = `
      <div class="queue-empty wrong-channel-notice">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <p><strong>Você não está no mesmo canal que o bot</strong></p>
        <p>Entre no canal <span class="wc-channel-name">${sanitize(botChName)}</span> para controlar a reprodução.</p>
      </div>`;
    return;
  }

  const items = [];

  // Current track as first item
  if (queueData.current) {
    items.push({ track: queueData.current, isCurrent: true, index: -1 });
  }

  // Queue tracks
  for (const t of (queueData.tracks || [])) {
    items.push({ track: t, isCurrent: false, index: t.index });
  }

  if (!items.length) {
    if (!currentVoiceChannelId) {
      queueList.innerHTML = `<div class="queue-empty queue-empty-voice">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        <p>Join a voice channel on this server to start playing</p>
      </div>`;
    } else {
      queueList.innerHTML = '<div class="queue-empty"><p>No tracks in queue</p></div>';
    }
    return;
  }

  queueList.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = `queue-item${item.isCurrent ? ' playing' : ''}`;

    // Drag handle for non-current tracks
    const isDraggable = !item.isCurrent && item.index >= 0;

    const num = item.isCurrent
      ? `<div class="playing-indicator"><span></span><span></span><span></span><span></span></div>`
      : `${i + 1}`;

    const thumb = item.track.thumbnail
      ? `<img class="qi-thumb" src="${sanitize(proxifyImageUrl(item.track.thumbnail))}" alt="">`
      : `<div class="qi-thumb" style="background:var(--bg-hover)"></div>`;

    const addedBy = item.track.requester?.username
      ? sanitize(item.track.requester.username)
      : '';

    const dragHandle = isDraggable
      ? `<div class="qi-drag"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></div>`
      : `<div class="qi-drag"></div>`;

    el.innerHTML = `
      ${dragHandle}
      <div class="qi-num">${num}</div>
      <div class="qi-track">
        ${thumb}
        <div class="qi-info">
          <div class="qi-title">${sanitize(item.track.title)}</div>
          <div class="qi-author">${sanitize(item.track.author)}</div>
        </div>
      </div>
      <div class="qi-added-by">${addedBy}</div>
      <div class="qi-duration">${formatTime(item.track.length)}</div>
    `;

    // Drag-and-drop for queue tracks (not the currently playing)
    if (isDraggable) {
      el.draggable = true;
      el.dataset.queueIndex = item.index;

      el.ondragstart = (e) => {
        dragSrcIndex = item.index;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      };
      el.ondragend = () => {
        el.classList.remove('dragging');
        document.querySelectorAll('.queue-item.drag-over').forEach(x => x.classList.remove('drag-over'));
        dragSrcIndex = null;
      };
      el.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-over');
      };
      el.ondragleave = () => {
        el.classList.remove('drag-over');
      };
      el.ondrop = async (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const toIndex = item.index;
        if (dragSrcIndex !== null && dragSrcIndex !== toIndex) {
          await moveTrack(dragSrcIndex, toIndex);
        }
      };
    }

    // Double-click to skip to track in queue
    if (!item.isCurrent && item.index >= 0) {
      el.ondblclick = () => skipTo(item.index);
    }

    // Right-click context menu
    el.oncontextmenu = (e) => {
      e.preventDefault();
      showContextMenu(e, {
        track: item.track,
        queueIndex: item.index,
        isCurrent: item.isCurrent
      });
    };

    queueList.appendChild(el);
  });
}

async function moveTrack(from, to) {
  if (!currentGuildId) return;
  try {
    await api(`/queue/${currentGuildId}/move`, {
      method: 'POST',
      body: JSON.stringify({ from, to, voiceChannelId: currentVoiceChannelId })
    });
    showToast('Queue reordered', 'success');
    await refreshState();
  } catch (err) {
    if (err.status === 403) showToast(err.error || 'You do not have permission to reorder the queue', 'warn');
  }
}

// ── Mobile Full-Screen Player ──
let mpQueueVisible = false;

function openMobilePlayer() {
  if (!mobilePlayer) return;
  mobilePlayer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobilePlayer() {
  if (!mobilePlayer) return;
  mobilePlayer.classList.remove('open');
  document.body.style.overflow = '';
}

function toggleMobileQueue() {
  mpQueueVisible = !mpQueueVisible;
  if (mpQueueVisible) {
    mpNpView.classList.add('hidden');
    mpQueueView.classList.remove('hidden');
    mpHeaderLabel.textContent = 'Queue';
    renderMobileQueue();
  } else {
    mpQueueView.classList.add('hidden');
    mpNpView.classList.remove('hidden');
    mpHeaderLabel.textContent = 'Now Playing';
  }
}

function renderMobileQueue() {
  if (!mpQueueList) return;
  mpQueueList.innerHTML = '';

  const items = [];
  if (queueData.current) items.push({ track: queueData.current, isCurrent: true });
  for (const t of (queueData.tracks || [])) items.push({ track: t, isCurrent: false, index: t.index });

  if (!items.length) {
    mpQueueList.innerHTML = '<div class="queue-empty"><p>Queue is empty</p></div>';
    return;
  }

  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = `mp-queue-item${item.isCurrent ? ' playing' : ''}`;
    const thumb = item.track.thumbnail
      ? `<img class="mp-qi-thumb" src="${sanitize(proxifyImageUrl(item.track.thumbnail))}" alt="">`
      : `<div class="mp-qi-thumb"></div>`;
    const num = item.isCurrent
      ? `<div class="playing-indicator"><span></span><span></span><span></span><span></span></div>`
      : String(i + 1);
    el.innerHTML = `
      <div class="mp-qi-num">${num}</div>
      ${thumb}
      <div class="mp-qi-info">
        <div class="mp-qi-title">${sanitize(item.track.title)}</div>
        <div class="mp-qi-author">${sanitize(item.track.author)}</div>
      </div>
      <div class="mp-qi-dur">${formatTime(item.track.length)}</div>`;
    if (!item.isCurrent && item.index >= 0) {
      el.onclick = () => skipTo(item.index);
    }
    mpQueueList.appendChild(el);
  });
}

function syncMobilePlayer() {
  if (!mobilePlayer) return;

  if (!playerState.active || !queueData.current) {
    if (mpTitle) mpTitle.textContent = '';
    if (mpAuthor) mpAuthor.textContent = '';
    if (mpProgressFill) mpProgressFill.style.width = '0%';
    if (npMiniFill) npMiniFill.style.width = '0%';
    if (mpTimeCur) mpTimeCur.textContent = '0:00';
    if (mpTimeTot) mpTimeTot.textContent = '0:00';
    mobilePlayer.classList.remove('controls-locked');
    return;
  }

  // Lock controls if user is in a different channel than the bot
  mobilePlayer.classList.toggle('controls-locked', isWrongChannel());

  const track = queueData.current;
  if (mpTitle) mpTitle.textContent = track.title;
  if (mpAuthor) mpAuthor.textContent = track.author;

  if (track.thumbnail) {
    if (mpThumb) { mpThumb.src = proxifyImageUrl(track.thumbnail); mpThumb.classList.remove('hidden'); }
    if (mpThumbPh) mpThumbPh.classList.add('hidden');
  } else {
    if (mpThumb) mpThumb.classList.add('hidden');
    if (mpThumbPh) mpThumbPh.classList.remove('hidden');
  }

  const pos = queueData.position || playerState.position || 0;
  const dur = track.length || 0;
  const pct = dur > 0 ? `${(pos / dur) * 100}%` : '0%';
  if (!isSeeking) {
    if (mpProgressFill) mpProgressFill.style.width = pct;
    if (mpTimeCur) mpTimeCur.textContent = formatTime(pos);
    if (mpTimeTot) mpTimeTot.textContent = formatTime(dur);
  }
  if (npMiniFill) npMiniFill.style.width = pct;

  // Pause/play icons
  const isPaused = playerState.paused;
  [{ pause: mpIconPause, play: mpIconPlay }, { pause: npMiniIconPause, play: npMiniIconPlay }].forEach(({ pause, play }) => {
    if (pause) pause.classList.toggle('hidden', isPaused);
    if (play) play.classList.toggle('hidden', !isPaused);
  });

  // Loop
  const loopMode = playerState.loop || 'none';
  if (mpLoop) mpLoop.classList.toggle('loop-active', loopMode !== 'none');
  if (mpLoopBadge) {
    if (loopMode === 'track') { mpLoopBadge.textContent = '1'; mpLoopBadge.classList.remove('hidden'); if (mpLoop) mpLoop.title = 'Loop: Track'; }
    else if (loopMode === 'queue') { mpLoopBadge.textContent = '∞'; mpLoopBadge.classList.remove('hidden'); if (mpLoop) mpLoop.title = 'Loop: Queue'; }
    else { mpLoopBadge.classList.add('hidden'); if (mpLoop) mpLoop.title = 'Loop: Off'; }
  }

  // Lyrics button
  if (mpLyricsBtn) mpLyricsBtn.classList.toggle('lyrics-active', lyricsOpen);

  // Volume
  const currentVol = playerState.volume ?? 100;
  if (mpVolPicker) mpVolPicker.querySelectorAll('.mp-vol-opt').forEach(opt => {
    opt.classList.toggle('active', parseInt(opt.dataset.vol) === currentVol);
  });

  // Refresh queue if showing
  if (mpQueueVisible) renderMobileQueue();
}

function initMobileProgressBar() {
  if (!mpProgressBar) return;
  let touching = false;

  function getPct(e) {
    const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
    const rect = mpProgressBar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
  }

  mpProgressBar.addEventListener('touchstart', (e) => {
    touching = true;
    isSeeking = true;
    if (mpProgressFill) mpProgressFill.style.width = `${getPct(e) * 100}%`;
    e.preventDefault();
  }, { passive: false });

  mpProgressBar.addEventListener('touchmove', (e) => {
    if (!touching) return;
    if (mpProgressFill) mpProgressFill.style.width = `${getPct(e) * 100}%`;
    e.preventDefault();
  }, { passive: false });

  mpProgressBar.addEventListener('touchend', async (e) => {
    if (!touching) return;
    touching = false;
    isSeeking = false;
    if (!playerState.active || !queueData.current) return;
    seekTo(Math.floor(getPct(e) * (queueData.current.length || 0)));
  });

  mpProgressBar.addEventListener('click', (e) => {
    if (!playerState.active || !queueData.current) return;
    seekTo(Math.floor(getPct(e) * (queueData.current.length || 0)));
  });
}

// ── Now Playing Bar ──
function renderNowPlaying() {
  if (!playerState.active || !queueData.current) {
    nowPlaying.classList.add('inactive');
    npTitle.textContent = '';
    npAuthor.textContent = '';
    npThumb.src = '';
    npThumb.classList.add('hidden');
    npThumbPlaceholder.classList.remove('hidden');
    npProgressFill.style.width = '0%';
    npTimeCurrent.textContent = '0:00';
    npTimeTotal.textContent = '0:00';
    return;
  }

  nowPlaying.classList.remove('inactive');
  nowPlaying.classList.toggle('controls-locked', isWrongChannel());

  const track = queueData.current;
  npTitle.textContent = track.title;
  npAuthor.textContent = track.author;

  if (track.thumbnail) {
    npThumb.src = proxifyImageUrl(track.thumbnail);
    npThumb.classList.remove('hidden');
    npThumbPlaceholder.classList.add('hidden');
  } else {
    npThumb.classList.add('hidden');
    npThumbPlaceholder.classList.remove('hidden');
  }

  const pos = queueData.position || playerState.position || 0;
  const dur = track.length || 0;
  if (!isSeeking) {
    npTimeCurrent.textContent = formatTime(pos);
    npTimeTotal.textContent = formatTime(dur);
    npProgressFill.style.width = dur > 0 ? `${(pos / dur) * 100}%` : '0%';
  }

  // Pause/play icon
  if (playerState.paused) {
    iconPause.classList.add('hidden');
    iconPlay.classList.remove('hidden');
  } else {
    iconPause.classList.remove('hidden');
    iconPlay.classList.add('hidden');
  }

  // Loop indicator with badge
  const loopMode = playerState.loop || 'none';
  btnLoop.classList.toggle('loop-active', loopMode !== 'none');
  if (loopMode === 'track') {
    loopBadge.textContent = '1';
    loopBadge.classList.remove('hidden');
    btnLoop.title = 'Loop: Track';
  } else if (loopMode === 'queue') {
    loopBadge.textContent = '∞';
    loopBadge.classList.remove('hidden');
    btnLoop.title = 'Loop: Queue';
  } else {
    loopBadge.classList.add('hidden');
    btnLoop.title = 'Loop: Off';
  }

  // Volume
  const currentVol = playerState.volume ?? 100;
  volumeDropdown.querySelectorAll('.vol-option').forEach(opt => {
    opt.classList.toggle('active', parseInt(opt.dataset.vol) === currentVol);
  });

  // If lyrics panel is open, check if track changed and re-sync
  if (lyricsOpen) {
    const newKey = `${track.title}|${track.author}`;
    if (newKey !== lyricsCurrentTrackKey) {
      showLyrics(); // re-fetch for new track
    } else if (lyricsTimedLines.length) {
      syncLyricsHighlight();
    }
  }

  // Sync mobile full-screen player
  syncMobilePlayer();
}

// ── Player Commands ──
async function sendCommand(action, body = {}) {
  if (!currentGuildId) return;
  if (currentVoiceChannelId) body.voiceChannelId = currentVoiceChannelId;
  try {
    return await api(`/player/${currentGuildId}/${action}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  } catch (err) {
    if (err.status === 400 && err.error?.includes('voice channel')) {
      showVoiceChannelModal();
    } else if (err.status === 403) {
      showToast(err.error || 'You do not have permission to do that', 'warn');
    }
    throw err;
  }
}

async function togglePause() {
  if (!playerState.active) return;
  try {
    if (playerState.paused) {
      await sendCommand('resume');
    } else {
      await sendCommand('pause');
    }
    await refreshState();
  } catch (err) {
    if (err.status !== 403 && err.status !== 400) showToast('Failed to pause/resume', 'error');
  }
}

async function skip() {
  try {
    await sendCommand('skip');
    showToast('Skipped track', 'success');
    await refreshState();
  } catch (err) {
    if (err.status !== 403 && err.status !== 400) showToast('Failed to skip', 'error');
  }
}

async function stopPlayer() {
  try {
    await sendCommand('stop');
    showToast('Player stopped', 'info');
    await refreshState();
  } catch (err) {
    if (err.status !== 403 && err.status !== 400) showToast('Failed to stop', 'error');
  }
}

async function skipTo(index) {
  try {
    await api(`/queue/${currentGuildId}/skipto`, {
      method: 'POST',
      body: JSON.stringify({ index, voiceChannelId: currentVoiceChannelId })
    });
    await refreshState();
  } catch (err) {
    if (err.status === 403) showToast(err.error || 'You do not have permission to do that', 'warn');
  }
}

async function cycleLoop() {
  const modes = ['none', 'track', 'queue'];
  const labels = { none: 'Loop off', track: 'Looping track', queue: 'Looping queue' };
  const current = playerState.loop || 'none';
  const nextIdx = (modes.indexOf(current) + 1) % modes.length;
  try {
    await sendCommand('loop', { mode: modes[nextIdx] });
    showToast(labels[modes[nextIdx]], 'info');
    await refreshState();
  } catch (err) {
    if (err.status !== 403 && err.status !== 400) showToast('Failed to change loop', 'error');
  }
}

async function setVolume(vol) {
  try {
    await sendCommand('volume', { volume: parseInt(vol) });
    showToast(`Volume: ${vol}%`, 'info');
  } catch (err) {
    if (err.status !== 403 && err.status !== 400) showToast('Failed to set volume', 'error');
  }
}

async function seekTo(ms) {
  try {
    await sendCommand('seek', { position: ms });
    await refreshState();
  } catch {}
}

// ── Lyrics ──
let lyricsCache = {};
let lyricsOpen = false;
let lyricsTimedLines = [];
let lyricsSyncInterval = null;
let lyricsCurrentTrackKey = null;

async function showLyrics() {
  if (!currentGuildId || !playerState.active) return;
  const track = queueData.current;
  if (!track) return;

  lyricsOpen = true;
  lyricsPanel.classList.remove('hidden');
  lyricsTitle.textContent = track.title;
  lyricsArtist.textContent = track.author;
  lyricsThumb.src = proxifyImageUrl(track.thumbnail || '');
  lyricsBody.innerHTML = '<div class="lyrics-spacer-top"></div><p class="lyrics-loading">Loading lyrics...</p><div class="lyrics-spacer-bottom"></div>';
  lyricsSource.textContent = '';
  btnLyrics.classList.add('lyrics-active');

  const cacheKey = `${track.title}|${track.author}`;
  lyricsCurrentTrackKey = cacheKey;

  if (lyricsCache[cacheKey]) {
    renderLyrics(lyricsCache[cacheKey]);
    return;
  }

  try {
    const data = await api(`/lyrics/${currentGuildId}`);
    if (lyricsCurrentTrackKey !== cacheKey) return; // track changed
    if (data?.found) {
      lyricsCache[cacheKey] = data;
      renderLyrics(data);
    } else {
      lyricsBody.innerHTML = '<div class="lyrics-spacer-top"></div><p class="lyrics-loading">No lyrics found for this track.</p><div class="lyrics-spacer-bottom"></div>';
    }
  } catch {
    lyricsBody.innerHTML = '<div class="lyrics-spacer-top"></div><p class="lyrics-loading">Failed to fetch lyrics.</p><div class="lyrics-spacer-bottom"></div>';
  }
}

function renderLyrics(data) {
  lyricsTimedLines = data.timedLines || [];

  if (lyricsTimedLines.length) {
    lyricsBody.innerHTML =
      '<div class="lyrics-spacer-top"></div>' +
      lyricsTimedLines.map((line, i) =>
        `<div class="lyrics-line" data-idx="${i}" data-ts="${line.timestamp}">${sanitize(line.line)}</div>`
      ).join('') +
      '<div class="lyrics-spacer-bottom"></div>';

    // Click on a line to seek to that timestamp
    lyricsBody.querySelectorAll('.lyrics-line').forEach(el => {
      el.onclick = () => {
        const ts = parseInt(el.dataset.ts);
        if (!isNaN(ts)) seekTo(ts);
      };
    });

    startLyricsSync();
  } else if (data.lyrics) {
    lyricsBody.innerHTML =
      '<div class="lyrics-spacer-top"></div>' +
      `<div class="lyrics-plain">${sanitize(data.lyrics)}</div>` +
      '<div class="lyrics-spacer-bottom"></div>';
  } else {
    lyricsBody.innerHTML = '<div class="lyrics-spacer-top"></div><p class="lyrics-loading">No lyrics found.</p><div class="lyrics-spacer-bottom"></div>';
  }

  lyricsSource.textContent = data.source ? `Source: ${data.source}` : '';
}

function startLyricsSync() {
  stopLyricsSync();
  syncLyricsHighlight();
  lyricsSyncInterval = setInterval(syncLyricsHighlight, 200);
}

function stopLyricsSync() {
  if (lyricsSyncInterval) {
    clearInterval(lyricsSyncInterval);
    lyricsSyncInterval = null;
  }
}

function syncLyricsHighlight() {
  if (!lyricsOpen || !lyricsTimedLines.length) return;

  const pos = queueData.position || playerState.position || 0;

  // Find the current line index
  let activeIdx = -1;
  for (let i = lyricsTimedLines.length - 1; i >= 0; i--) {
    if (pos >= lyricsTimedLines[i].timestamp) {
      activeIdx = i;
      break;
    }
  }

  const lines = lyricsBody.querySelectorAll('.lyrics-line');
  lines.forEach((el, i) => {
    el.classList.remove('active', 'near');
    if (i === activeIdx) {
      el.classList.add('active');
    } else if (Math.abs(i - activeIdx) === 1) {
      el.classList.add('near');
    }
  });

  // Auto-scroll to active line
  if (activeIdx >= 0 && lines[activeIdx]) {
    const el = lines[activeIdx];
    const container = lyricsBody;
    const elTop = el.offsetTop;
    const containerHeight = container.clientHeight;
    const targetScroll = elTop - containerHeight * 0.38;

    const diff = targetScroll - container.scrollTop;
    if (Math.abs(diff) > 2) {
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }
}

function closeLyrics() {
  lyricsOpen = false;
  lyricsPanel.classList.add('hidden');
  btnLyrics.classList.remove('lyrics-active');
  if (mpLyricsBtn) mpLyricsBtn.classList.remove('lyrics-active');
  stopLyricsSync();
  lyricsTimedLines = [];
}

// ── Search ──
function handleSearch(e) {
  const q = e.target.value.trim();
  if (searchTimeout) clearTimeout(searchTimeout);
  if (!q) {
    searchResults.classList.add('hidden');
    return;
  }
  searchTimeout = setTimeout(() => doSearch(q), 400);
}

async function doSearch(q) {
  try {
    const data = await api(`/search?q=${encodeURIComponent(q)}`);
    if (!data?.tracks?.length) {
      searchResults.innerHTML = '<div class="search-result-item"><span class="sr-info"><span class="sr-title">No results found</span></span></div>';
      searchResults.classList.remove('hidden');
      return;
    }
    // If it's a playlist URL, show confirmation modal instead of search results
    if (data.type === 'PLAYLIST' && data.playlistName) {
      searchResults.classList.add('hidden');
      showPlaylistModal({
        name: data.playlistName,
        thumbnail: data.playlistThumbnail,
        count: data.totalTracks || data.tracks.length,
        query: q
      });
      return;
    }
    renderSearchResults(data.tracks);
  } catch {}
}

function renderSearchResults(tracks) {
  searchResults.innerHTML = '';
  for (const t of tracks.slice(0, 10)) {
    const el = document.createElement('div');
    el.className = 'search-result-item';

    const thumb = t.thumbnail
      ? `<img src="${sanitize(proxifyImageUrl(t.thumbnail))}" alt="">`
      : `<div style="width:40px;height:40px;background:var(--bg-hover);border-radius:4px"></div>`;

    el.innerHTML = `
      ${thumb}
      <div class="sr-info">
        <div class="sr-title">${sanitize(t.title)}</div>
        <div class="sr-author">${sanitize(t.author)}</div>
      </div>
      <div class="sr-duration">${formatTime(t.length)}</div>
    `;

    el.onclick = () => playTrack(t);

    // Right click: context menu with "Add to Queue" and "Add to Playlist"
    el.oncontextmenu = (e) => {
      e.preventDefault();
      showContextMenu(e, { track: t });
    };

    searchResults.appendChild(el);
  }
  searchResults.classList.remove('hidden');
}

// ── Playlist Confirmation Modal ──
let pendingPlaylistQuery = null;

function showPlaylistModal({ name, thumbnail, count, query }) {
  playlistName.textContent = name;
  playlistCount.textContent = `${count} track${count !== 1 ? 's' : ''}`;
  playlistThumb.src = proxifyImageUrl(thumbnail || '');
  playlistThumb.style.display = thumbnail ? '' : 'none';
  pendingPlaylistQuery = query;
  playlistModal.classList.remove('hidden');
}

function hidePlaylistModal() {
  playlistModal.classList.add('hidden');
  pendingPlaylistQuery = null;
}

async function confirmPlaylist() {
  const query = pendingPlaylistQuery;
  hidePlaylistModal();
  searchInput.value = '';
  if (!query) return;

  if (!currentVoiceChannelId) {
    showVoiceChannelModal({ _playlistQuery: query });
    return;
  }

  try {
    await sendCommand('play', { query });
    showToast('Added to queue', 'success');
    await refreshState();
  } catch {}
}

async function playTrack(track) {
  searchResults.classList.add('hidden');
  searchInput.value = '';

  if (!currentVoiceChannelId) {
    showVoiceChannelModal(track);
    return;
  }

  try {
    await sendCommand('play', { query: track.uri || track.title });
    showToast(`Playing: ${track.title}`, 'success');
    await refreshState();
  } catch {}
}

// ── Voice Channel Modal ──
function showVoiceChannelModal(pendingTrack) {
  const channels = window._voiceChannels || [];
  // Only show channels where the user is present
  const userChannels = channels.filter(vc =>
    vc.members.some(m => m.id === user.id)
  );

  vcList.innerHTML = '';

  if (!userChannels.length) {
    vcList.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:10px 14px;">You need to join a voice channel on Discord first.</p>';
    vcModal.classList.remove('hidden');
    return;
  }

  for (const vc of userChannels) {
    const el = document.createElement('div');
    el.className = 'vc-item';
    el.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
      <span>${sanitize(vc.name)}</span>
      <span class="vc-members">${vc.members.length} member${vc.members.length !== 1 ? 's' : ''}</span>
    `;
    el.onclick = async () => {
      currentVoiceChannelId = vc.id;
      vcModal.classList.add('hidden');
      if (pendingTrack?._playlistQuery) {
        try {
          await sendCommand('play', { query: pendingTrack._playlistQuery });
          await refreshState();
        } catch {}
      } else if (pendingTrack?._playlistPlayFrom) {
        const { playlistId, trackIndex } = pendingTrack._playlistPlayFrom;
        await playFromPlaylist(playlistId, trackIndex);
      } else if (pendingTrack?._playlistId) {
        await playUserPlaylist(pendingTrack._playlistId);
      } else if (pendingTrack) {
        await playTrack(pendingTrack);
      }
    };
    vcList.appendChild(el);
  }
  vcModal.classList.remove('hidden');
}

// ── Progress Bar Seek ──
function handleProgressClick(e) {
  if (!playerState.active || !queueData.current) return;
  const rect = npProgressBar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const dur = queueData.current.length || 0;
  seekTo(Math.floor(pct * dur));
}

// ── Logout ──
function logout() {
  token = null;
  user = null;
  localStorage.removeItem('kennyy_token');
  if (pollInterval) clearInterval(pollInterval);
  showLogin();
}

// ── Utilities ──
function formatTime(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function sanitize(str) {
  if (!str) return '';
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

// ── User Playlists ──
async function loadUserPlaylists() {
  try {
    const data = await api('/playlists');
    userPlaylists = data?.playlists || [];
    renderUserPlaylists();
  } catch {
    userPlaylists = [];
    renderUserPlaylists();
  }
}

function renderUserPlaylists() {
  userPlaylistList.innerHTML = '';
  if (!userPlaylists.length) {
    userPlaylistList.innerHTML = '<p style="color:var(--text-muted);font-size:12px;padding:4px 10px;">No playlists yet</p>';
    return;
  }
  for (const p of userPlaylists) {
    const el = document.createElement('div');
    el.className = 'playlist-item';
    el.dataset.id = p.id;

    const thumb = p.image
      ? `<img class="playlist-item-thumb" src="${sanitize(p.image)}" alt="">`
      : `<div class="playlist-item-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>`;

    el.innerHTML = `
      ${thumb}
      <div class="playlist-item-info">
        <div class="playlist-item-name">${sanitize(p.name)}</div>
        <div class="playlist-item-count">${p.trackCount} track${p.trackCount !== 1 ? 's' : ''}</div>
      </div>
    `;
    el.onclick = () => openPlaylistView(p.id);
    userPlaylistList.appendChild(el);
  }
}

function openCreatePlaylist() {
  currentEditPlaylistId = null;
  plEditTitle.textContent = 'New Playlist';
  plEditSave.textContent = 'Create';
  plEditName.value = '';
  plEditImage.value = '';
  plImportUrl.value = '';
  plImportStatus.classList.add('hidden');
  plImportStatus.textContent = '';
  plEditModal.classList.remove('hidden');
}

function openEditPlaylist(id) {
  const p = userPlaylists.find(x => x.id === id) || null;
  if (!p) return;
  currentEditPlaylistId = id;
  pendingTrackForNewPlaylist = null;
  plEditTitle.textContent = 'Edit Playlist';
  plEditSave.textContent = 'Save';
  plEditName.value = p.name || '';
  plEditImage.value = p.image || '';
  plImportUrl.value = '';
  plImportStatus.classList.add('hidden');
  plImportStatus.textContent = '';
  plEditModal.classList.remove('hidden');
}

async function savePlaylist() {
  const name = plEditName.value.trim();
  const image = plEditImage.value.trim() || null;
  if (!name) { plEditName.focus(); return; }

  try {
    if (currentEditPlaylistId) {
      await api(`/playlists/${currentEditPlaylistId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, image })
      });
    } else {
      const created = await api('/playlists', {
        method: 'POST',
        body: JSON.stringify({ name, image })
      });
      // If there's a pending track from context menu, add it
      if (pendingTrackForNewPlaylist && created?.id) {
        try {
          await api(`/playlists/${created.id}/tracks`, {
            method: 'POST',
            body: JSON.stringify({ tracks: [pendingTrackForNewPlaylist] })
          });
        } catch {}
      }
    }
    pendingTrackForNewPlaylist = null;
    plEditModal.classList.add('hidden');
    showToast(currentEditPlaylistId ? 'Playlist updated' : 'Playlist created', 'success');
    await loadUserPlaylists();
    // If we were viewing the edited playlist, refresh the view
    if (currentEditPlaylistId && viewingPlaylistId === currentEditPlaylistId) {
      openPlaylistView(currentEditPlaylistId);
    }
  } catch (err) {
    showToast('Failed to save playlist', 'error');
    console.error('Save playlist error:', err);
  }
}

async function importToPlaylist() {
  const url = plImportUrl.value.trim();
  if (!url) return;

  // We need a playlist to import into; create one first if this is a new playlist
  let targetId = currentEditPlaylistId;
  if (!targetId) {
    const name = plEditName.value.trim() || 'Imported Playlist';
    const image = plEditImage.value.trim() || null;
    try {
      const created = await api('/playlists', {
        method: 'POST',
        body: JSON.stringify({ name, image })
      });
      targetId = created.id;
      currentEditPlaylistId = targetId;
    } catch (err) {
      plImportStatus.textContent = 'Failed to create playlist';
      plImportStatus.className = 'pl-import-status error';
      plImportStatus.classList.remove('hidden');
      return;
    }
  }

  plImportBtn.disabled = true;
  plImportStatus.textContent = 'Importing tracks...';
  plImportStatus.className = 'pl-import-status';
  plImportStatus.classList.remove('hidden');

  try {
    const result = await api(`/playlists/${targetId}/import`, {
      method: 'POST',
      body: JSON.stringify({ url })
    });
    plImportStatus.textContent = `Imported ${result.imported} track${result.imported !== 1 ? 's' : ''}${result.playlistName ? ` from "${result.playlistName}"` : ''}`;
    plImportStatus.className = 'pl-import-status success';
    plImportUrl.value = '';
    showToast(`Imported ${result.imported} track${result.imported !== 1 ? 's' : ''}`, 'success');
    await loadUserPlaylists();
  } catch (err) {
    plImportStatus.textContent = err?.error || 'Import failed';
    plImportStatus.className = 'pl-import-status error';
  } finally {
    plImportBtn.disabled = false;
  }
}

async function openPlaylistView(id) {
  viewingPlaylistId = id;
  try {
    const playlist = await api(`/playlists/${id}`);
    if (!playlist) return;

    pvName.textContent = playlist.name;
    pvCount.textContent = `${playlist.tracks.length} track${playlist.tracks.length !== 1 ? 's' : ''}`;
    if (playlist.image) {
      pvThumb.src = proxifyImageUrl(playlist.image);
      pvThumb.classList.remove('hidden');
      pvThumbPlaceholder.classList.add('hidden');
    } else {
      pvThumb.classList.add('hidden');
      pvThumbPlaceholder.classList.remove('hidden');
    }

    renderPlaylistTracks(playlist);

    // Switch view: hide queue, show playlist
    queueView.classList.add('hidden');
    playlistView.classList.remove('hidden');
  } catch (err) {
    console.error('Open playlist view error:', err);
  }
}

function closePlaylistView() {
  playlistView.classList.add('hidden');
  queueView.classList.remove('hidden');
  viewingPlaylistId = null;
}

function renderPlaylistTracks(playlist) {
  pvTracks.innerHTML = '';
  if (!playlist.tracks.length) {
    pvTracks.innerHTML = '<div class="pv-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><p>No tracks yet</p><p style="font-size:12px">Edit this playlist to import tracks</p></div>';
    return;
  }
  playlist.tracks.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'pv-track';
    el.dataset.index = i;

    const thumb = t.thumbnail
      ? `<img class="pv-track-img" src="${sanitize(proxifyImageUrl(t.thumbnail))}" alt="">`
      : `<div class="pv-track-img"></div>`;

    el.innerHTML = `
      <div class="pv-track-num">
        <span class="pv-num-text">${i + 1}</span>
        <svg class="pv-play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
      </div>
      <div class="pv-track-main">
        ${thumb}
        <div class="pv-track-text">
          <div class="pv-track-title">${sanitize(t.title)}</div>
          <div class="pv-track-author">${sanitize(t.author)}</div>
        </div>
      </div>
      <div class="pv-track-dur">${formatTime(t.length)}</div>
    `;

    // Left click: play from this track
    el.onclick = () => playFromPlaylist(playlist.id, i);

    // Right click: context menu
    el.oncontextmenu = (e) => {
      e.preventDefault();
      showContextMenu(e, {
        track: t,
        playlistId: playlist.id,
        trackIndex: i
      });
    };

    pvTracks.appendChild(el);
  });
}

function showPvLoading(text) {
  pvLoadingText.textContent = text || 'Loading playlist...';
  pvLoading.classList.remove('hidden');
}
function hidePvLoading() {
  pvLoading.classList.add('hidden');
}

async function playFromPlaylist(playlistId, trackIndex) {
  if (!currentGuildId) return;

  if (!currentVoiceChannelId) {
    showVoiceChannelModal({ _playlistPlayFrom: { playlistId, trackIndex } });
    return;
  }

  try {
    const playlist = await api(`/playlists/${playlistId}`);
    if (!playlist || !playlist.tracks[trackIndex]) return;
    const t = playlist.tracks[trackIndex];
    await sendCommand('play', { query: t.uri || `${t.title} ${t.author}`, forcePlay: true });
    showToast(`Playing: ${t.title}`, 'success');
    await refreshState();
  } catch (err) {
    if (err.status === 400 && err.error?.includes('voice channel')) {
      showVoiceChannelModal({ _playlistPlayFrom: { playlistId, trackIndex } });
    }
  }
}

async function removePlaylistTrack(playlistId, index) {
  try {
    await api(`/playlists/${playlistId}/tracks/${index}`, { method: 'DELETE' });
    await loadUserPlaylists();
    openPlaylistView(playlistId);
  } catch {}
}

async function playUserPlaylist(id) {
  if (!currentGuildId) return;

  if (!currentVoiceChannelId) {
    showVoiceChannelModal({ _playlistId: id });
    return;
  }

  showPvLoading('Adding tracks to queue...');
  try {
    await api(`/playlists/${id}/play`, {
      method: 'POST',
      body: JSON.stringify({ guildId: currentGuildId, voiceChannelId: currentVoiceChannelId })
    });
    showToast('Playlist added to queue', 'success');
    await refreshState();
  } catch (err) {
    if (err.status === 400 && err.error?.includes('voice channel')) {
      showVoiceChannelModal({ _playlistId: id });
    }
  } finally {
    hidePvLoading();
  }
}

async function deleteUserPlaylist(id) {
  if (!confirm('Delete this playlist? This cannot be undone.')) return;
  try {
    await api(`/playlists/${id}`, { method: 'DELETE' });
    showToast('Playlist deleted', 'success');
    if (viewingPlaylistId === id) closePlaylistView();
    viewingPlaylistId = null;
    await loadUserPlaylists();
  } catch {
    showToast('Failed to delete playlist', 'error');
  }
}

async function exportUserPlaylist(id) {
  try {
    const data = await api(`/playlists/${id}/export`);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name || 'playlist'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Playlist exported', 'success');
  } catch {
    showToast('Export failed', 'error');
  }
}

function importPlaylistFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api('/playlists/import-file', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Playlist imported from file', 'success');
      await loadUserPlaylists();
    } catch (err) {
      showToast('Import failed', 'error');
      console.error('Import file error:', err);
    }
  };
  input.click();
}

// ── Context Menu ──
function showContextMenu(e, target) {
  ctxTarget = target;

  // Position menu
  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.classList.remove('hidden');

  const isQueueCtx = target.queueIndex !== undefined;

  // Show/hide items based on context
  if (isQueueCtx) {
    // Queue context: hide non-queue items, show queue items
    ctxAddQueue.classList.add('hidden');
    ctxRemovePlaylist.classList.add('hidden');
    ctxSeparatorQueue.classList.remove('hidden');
    ctxPlayNext.classList.toggle('hidden', target.queueIndex === 0);
    ctxSkipTo.classList.remove('hidden');
    ctxRemoveQueue.classList.remove('hidden');
  } else {
    // Search / playlist context
    ctxAddQueue.classList.remove('hidden');
    ctxSeparatorQueue.classList.add('hidden');
    ctxPlayNext.classList.add('hidden');
    ctxSkipTo.classList.add('hidden');
    ctxRemoveQueue.classList.add('hidden');
    // Show/hide "Remove from Playlist"
    if (target.playlistId !== undefined && target.trackIndex !== undefined) {
      ctxRemovePlaylist.classList.remove('hidden');
    } else {
      ctxRemovePlaylist.classList.add('hidden');
    }
  }

  // Populate "Add to Playlist" submenu
  ctxPlaylistSub.innerHTML = '';
  for (const p of userPlaylists) {
    const item = document.createElement('div');
    item.className = 'ctx-sub-item';
    item.textContent = p.name;
    item.onclick = (ev) => {
      ev.stopPropagation();
      addTrackToPlaylist(p.id, ctxTarget.track);
      hideContextMenu();
    };
    ctxPlaylistSub.appendChild(item);
  }
  // "New playlist" option at bottom
  const newPl = document.createElement('div');
  newPl.className = 'ctx-sub-item';
  newPl.style.color = 'var(--accent)';
  newPl.textContent = '+ New Playlist';
  newPl.onclick = (ev) => {
    ev.stopPropagation();
    const track = ctxTarget?.track;
    hideContextMenu();
    if (track) openCreatePlaylistWithTrack(track);
  };
  ctxPlaylistSub.appendChild(newPl);

  // Clamp to viewport
  requestAnimationFrame(() => {
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      contextMenu.style.left = `${window.innerWidth - rect.width - 4}px`;
    }
    if (rect.bottom > window.innerHeight) {
      contextMenu.style.top = `${window.innerHeight - rect.height - 4}px`;
    }
  });
}

function hideContextMenu() {
  contextMenu.classList.add('hidden');
  ctxTarget = null;
}

async function addTrackToPlaylist(playlistId, track) {
  try {
    await api(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ tracks: [track] })
    });
    const pl = userPlaylists.find(p => p.id === playlistId);
    showToast(`Added to ${pl?.name || 'playlist'}`, 'success');
    await loadUserPlaylists();
    // Refresh view if we're looking at this playlist
    if (viewingPlaylistId === playlistId) openPlaylistView(playlistId);
  } catch (err) {
    showToast('Failed to add to playlist', 'error');
    console.error('Add to playlist error:', err);
  }
}

function openCreatePlaylistWithTrack(track) {
  pendingTrackForNewPlaylist = track;
  openCreatePlaylist();
}

async function ctxAddToQueue() {
  const target = ctxTarget;
  hideContextMenu();
  if (!target?.track) return;
  const t = target.track;
  if (!currentVoiceChannelId) {
    showVoiceChannelModal({ uri: t.uri, title: t.title });
    return;
  }
  try {
    await sendCommand('play', { query: t.uri || t.title });
    showToast('Added to queue', 'success');
    await refreshState();
  } catch {}
}

async function ctxRemoveFromPlaylist() {
  const target = ctxTarget;
  hideContextMenu();
  if (!target?.playlistId || target.trackIndex === undefined) return;
  await removePlaylistTrack(target.playlistId, target.trackIndex);
  showToast('Removed from playlist', 'success');
}

async function ctxSkipToTrack() {
  const target = ctxTarget;
  hideContextMenu();
  if (!target || target.queueIndex === undefined || target.isCurrent) return;
  try {
    await skipTo(target.queueIndex);
  } catch {}
}

async function ctxMovePlayNext() {
  const target = ctxTarget;
  hideContextMenu();
  if (!target || target.queueIndex === undefined || target.queueIndex === 0) return;
  try {
    await moveTrack(target.queueIndex, 0);
    showToast('Moved to next', 'success');
  } catch {}
}

async function ctxRemoveFromQueue() {
  const target = ctxTarget;
  hideContextMenu();
  if (!target || target.queueIndex === undefined || target.isCurrent) return;
  try {
    await api(`/queue/${currentGuildId}/${target.queueIndex}`, {
      method: 'DELETE',
      body: JSON.stringify({ voiceChannelId: currentVoiceChannelId })
    });
    showToast('Removed from queue', 'success');
    await refreshState();
  } catch (err) {
    if (err.status === 403) showToast(err.error || 'You do not have permission to remove tracks', 'warn');
  }
}

// ── Event Bindings ──
btnLogin.onclick = () => { window.location.href = OAUTH_URL; };
btnLogout.onclick = logout;
btnToggleServers.onclick = () => {
  guildOtherSection.classList.toggle('collapsed');
  const isCollapsed = guildOtherSection.classList.contains('collapsed');
  localStorage.setItem('kennyy_servers_collapsed', isCollapsed);
};
btnPause.onclick = togglePause;
btnSkip.onclick = skip;
btnStop.onclick = stopPlayer;
btnLoop.onclick = cycleLoop;
btnLyrics.onclick = showLyrics;
lyricsClose.onclick = closeLyrics;
searchInput.oninput = handleSearch;
npProgressBar.onclick = handleProgressClick;
vcModalClose.onclick = () => vcModal.classList.add('hidden');
playlistConfirm.onclick = confirmPlaylist;
playlistCancel.onclick = hidePlaylistModal;
playlistModal.onclick = (e) => { if (e.target === playlistModal) hidePlaylistModal(); };

// ── Mobile Player Bindings ──
// Mini bar → open full-screen player
if (nowPlaying) {
  nowPlaying.addEventListener('click', (e) => {
    if (window.innerWidth > 768) return;
    if (e.target.closest('.np-mini-actions')) return;
    if (!playerState.active) return;
    openMobilePlayer();
  });
}
// Mini pause/skip
if (npMiniPause) npMiniPause.onclick = (e) => { e.stopPropagation(); togglePause(); };
if (npMiniSkip)  npMiniSkip.onclick  = (e) => { e.stopPropagation(); skip(); };
// Full-screen player controls
if (mpClose)       mpClose.onclick       = closeMobilePlayer;
if (mpQueueToggle) mpQueueToggle.onclick = toggleMobileQueue;
if (mpPause)       mpPause.onclick       = togglePause;
if (mpSkip)        mpSkip.onclick        = skip;
if (mpStop)        mpStop.onclick        = stopPlayer;
if (mpLoop)        mpLoop.onclick        = cycleLoop;
if (mpLyricsBtn)   mpLyricsBtn.onclick   = () => { closeMobilePlayer(); showLyrics(); };
if (mpVolBtn) {
  mpVolBtn.onclick = (e) => {
    e.stopPropagation();
    mpVolPicker?.classList.toggle('hidden');
  };
}
if (mpVolPicker) {
  mpVolPicker.onclick = async (e) => {
    const opt = e.target.closest('.mp-vol-opt');
    if (!opt) return;
    mpVolPicker.classList.add('hidden');
    await setVolume(opt.dataset.vol);
    await refreshState();
  };
}
// Swipe-down to close mobile player
if (mobilePlayer) {
  let mpTouchStartY = 0;
  mobilePlayer.addEventListener('touchstart', (e) => {
    mpTouchStartY = e.touches[0].clientY;
  }, { passive: true });
  mobilePlayer.addEventListener('touchend', (e) => {
    const dy = e.changedTouches[0].clientY - mpTouchStartY;
    if (dy > 80) closeMobilePlayer();
  }, { passive: true });
}

// Playlist management bindings
btnCreatePlaylist.onclick = openCreatePlaylist;
plEditCancel.onclick = () => { pendingTrackForNewPlaylist = null; plEditModal.classList.add('hidden'); };
plEditSave.onclick = savePlaylist;
plImportBtn.onclick = importToPlaylist;
plEditModal.onclick = (e) => { if (e.target === plEditModal) { pendingTrackForNewPlaylist = null; plEditModal.classList.add('hidden'); } };

// Playlist view bindings
pvBack.onclick = closePlaylistView;
pvPlay.onclick = () => { if (viewingPlaylistId) playUserPlaylist(viewingPlaylistId); };
pvShuffle.onclick = () => { if (viewingPlaylistId) playUserPlaylist(viewingPlaylistId); }; // TODO: shuffle mode
pvEdit.onclick = () => { if (viewingPlaylistId) openEditPlaylist(viewingPlaylistId); };
pvExport.onclick = () => { if (viewingPlaylistId) exportUserPlaylist(viewingPlaylistId); };
pvDelete.onclick = () => { if (viewingPlaylistId) deleteUserPlaylist(viewingPlaylistId); };

// Context menu bindings
ctxAddQueue.onclick = ctxAddToQueue;
ctxRemovePlaylist.onclick = ctxRemoveFromPlaylist;
ctxSkipTo.onclick = ctxSkipToTrack;
ctxPlayNext.onclick = ctxMovePlayNext;
ctxRemoveQueue.onclick = ctxRemoveFromQueue;
document.addEventListener('click', (e) => {
  // Close context menu
  if (!e.target.closest('.context-menu')) hideContextMenu();
  // Close search results
  if (!e.target.closest('.search-box')) searchResults.classList.add('hidden');
  // Close volume dropdown
  if (!e.target.closest('.volume-wrap')) volumeDropdown.classList.add('hidden');
});
document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('.pv-track') && !e.target.closest('.search-result-item') && !e.target.closest('.queue-item')) {
    hideContextMenu();
  }
});

btnVolume.onclick = (e) => {
  e.stopPropagation();
  volumeDropdown.classList.toggle('hidden');
};
volumeDropdown.onclick = async (e) => {
  const opt = e.target.closest('.vol-option');
  if (!opt) return;
  volumeDropdown.classList.add('hidden');
  await setVolume(opt.dataset.vol);
  await refreshState();
};

// Close lyrics panel when clicking backdrop
lyricsPanel.querySelector('.lyrics-backdrop').addEventListener('click', closeLyrics);

// ── Permissions Panel ──
let permissionsOpen = false;
let permissionsState = { adminId: null, users: [], isAdmin: false, myPermissions: {}, myUserId: null };

const permPanel     = $('#perm-panel');
const permBackdrop  = $('#perm-backdrop');
const permClose     = $('#perm-close');
const permBody      = $('#perm-body');
const btnPermissions = $('#btn-permissions');
const mpPermBtn      = $('#mp-perm-btn');

const PERM_LABELS = {
  addTracks:     { label: 'Add songs to queue',  icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' },
  removeTracks:  { label: 'Remove songs',         icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>' },
  controlPlayer: { label: 'Control player',       icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21"/></svg>' },
  reorderQueue:  { label: 'Reorder queue',        icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><polyline points="8 5 3 10 8 15"/></svg>' }
};

async function loadPermissions() {
  if (!currentGuildId) return;
  try {
    const data = await api(`/permissions/${currentGuildId}`);
    if (data) permissionsState = data;
  } catch {}
}

function openPermissionsPanel() {
  permissionsOpen = true;
  permPanel.classList.add('open');
  btnPermissions?.classList.add('perm-active');
  mpPermBtn?.classList.add('perm-active');
  loadPermissions().then(() => renderPermissionsPanel());
}

function closePermissionsPanel() {
  permissionsOpen = false;
  permPanel.classList.remove('open');
  btnPermissions?.classList.remove('perm-active');
  mpPermBtn?.classList.remove('perm-active');
}

function renderPermissionsPanel() {
  if (!permBody) return;

  const { adminId, users, isAdmin: iAm, myUserId } = permissionsState;

  // Collect all VC members (from voice channel data) to show non-registered users too
  const vcMembers = [];
  const botVcId = botVoiceChannelId || playerState?.voiceId;
  if (botVcId && window._voiceChannels) {
    const ch = window._voiceChannels.find(c => c.id === botVcId);
    if (ch) {
      for (const m of (ch.members || [])) {
        vcMembers.push(m);
      }
    }
  }

  // Merge: session users first, then VC-only members
  const sessionUserIds = new Set(users.map(u => u.id));
  const vcOnlyMembers = vcMembers.filter(m => !sessionUserIds.has(m.id));

  if (!adminId && users.length === 0 && vcOnlyMembers.length === 0) {
    permBody.innerHTML = '<div class="perm-empty">No active session.<br>Start playing music to create a session.</div>';
    return;
  }

  let html = '';

  // If there's an admin, show them first
  if (adminId) {
    const adminUser = users.find(u => u.id === adminId);
    const adminName = adminUser?.username || 'Unknown';
    html += `<div class="perm-section-label">Session Admin</div>`;
    html += buildUserRow(adminId, adminName, adminUser?.avatarUrl || null, users.find(u => u.id === adminId)?.permissions || {}, true, iAm, myUserId);
  }

  // Non-admin session users
  const others = users.filter(u => u.id !== adminId);
  if (others.length > 0 || vcOnlyMembers.length > 0) {
    html += `<div class="perm-section-label">Members</div>`;
    for (const u of others) {
      html += buildUserRow(u.id, u.username, u.avatarUrl, u.permissions, false, iAm, myUserId);
    }
    // VC members who haven't interacted yet (no permissions row, just identity)
    for (const m of vcOnlyMembers) {
      if (m.id === myUserId) continue; // skip self if already shown
      html += buildUserRow(m.id, m.username || m.globalName || 'Unknown', m.avatar || null, null, false, iAm, myUserId);
    }
  }

  permBody.innerHTML = html;

  // Wire toggle events
  permBody.querySelectorAll('.perm-toggle-input').forEach(input => {
    input.addEventListener('change', async () => {
      const userId = input.dataset.userId;
      const perm = input.dataset.perm;
      const value = input.checked;
      try {
        await api(`/permissions/${currentGuildId}/user/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ [perm]: value })
        });
        // Update local state
        const u = permissionsState.users.find(x => x.id === userId);
        if (u) u.permissions[perm] = value;
      } catch (err) {
        input.checked = !value; // revert on error
        showToast(err?.error || 'Failed to update permission', 'error');
      }
    });
  });

  // Wire Give Admin buttons
  permBody.querySelectorAll('.perm-give-admin-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const toUserId = btn.dataset.userId;
      const toName = btn.dataset.username;
      if (!confirm(`Transfer admin to ${toName}?`)) return;
      try {
        await api(`/permissions/${currentGuildId}/transfer`, {
          method: 'POST',
          body: JSON.stringify({ toUserId })
        });
        showToast(`Admin transferred to ${toName}`, 'success');
        await loadPermissions();
        renderPermissionsPanel();
      } catch (err) {
        showToast(err?.error || 'Failed to transfer admin', 'error');
      }
    });
  });
}

function buildUserRow(userId, username, avatarUrl, permissions, isAdminUser, viewerIsAdmin, myUserId) {
  const isMe = userId === myUserId;
  const isAdminRow = isAdminUser;
  const noPermsYet = permissions === null; // VC-only member, no session entry

  // Avatar
  const avatarHtml = avatarUrl
    ? `<img class="perm-user-avatar" src="${sanitize(avatarUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const initials = sanitize((username || '?').slice(0, 2).toUpperCase());
  const avatarPhHtml = `<div class="perm-user-avatar-ph" style="${avatarUrl ? 'display:none' : ''}">${initials}</div>`;

  // Badges
  const adminBadge = isAdminRow
    ? `<span class="perm-badge-admin">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
        Admin
      </span>`
    : '';
  const youBadge = isMe ? `<span class="perm-badge-you">you</span>` : '';

  // Permission toggles (only show if user has a session entry)
  let togglesHtml = '';
  if (!noPermsYet && !isAdminRow) {
    togglesHtml = `<div class="perm-toggles">`;
    for (const [perm, meta] of Object.entries(PERM_LABELS)) {
      const isOn = permissions?.[perm] === true;
      const locked = !viewerIsAdmin || isMe; // non-admins or self can't edit
      togglesHtml += `
        <div class="perm-toggle-row${locked ? ' locked' : ''}">
          <span class="perm-toggle-label">${meta.icon} ${meta.label}</span>
          <label class="perm-toggle-switch${locked ? ' locked' : ''}">
            <input type="checkbox" class="perm-toggle-input"
              data-user-id="${sanitize(userId)}"
              data-perm="${perm}"
              ${isOn ? 'checked' : ''}
              ${locked ? 'disabled' : ''}>
            <span class="perm-toggle-track"><span class="perm-toggle-thumb"></span></span>
          </label>
        </div>`;
    }
    togglesHtml += `</div>`;
  } else if (isAdminRow) {
    // Admin row: show all permissions as on (locked)
    togglesHtml = `<div class="perm-toggles">`;
    for (const [perm, meta] of Object.entries(PERM_LABELS)) {
      togglesHtml += `
        <div class="perm-toggle-row locked">
          <span class="perm-toggle-label">${meta.icon} ${meta.label}</span>
          <label class="perm-toggle-switch locked">
            <input type="checkbox" checked disabled>
            <span class="perm-toggle-track"><span class="perm-toggle-thumb"></span></span>
          </label>
        </div>`;
    }
    togglesHtml += `</div>`;
  }

  // Give Admin button (only visible to current admin, for non-admin users)
  const giveAdminBtn = (viewerIsAdmin && !isAdminRow && !isMe && !noPermsYet)
    ? `<button class="perm-give-admin-btn" data-user-id="${sanitize(userId)}" data-username="${sanitize(username)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
        Give Admin
      </button>`
    : '';

  const pendingNotice = noPermsYet
    ? `<div style="font-size:11px;color:var(--text-muted);padding:2px 4px 6px;">Joined VC – will get default permissions on first action</div>`
    : '';

  return `
    <div class="perm-user">
      <div class="perm-user-identity">
        ${avatarHtml}${avatarPhHtml}
        <div class="perm-user-name-wrap">
          <div class="perm-user-name">${sanitize(username)}</div>
          <div class="perm-user-tag">${adminBadge}${youBadge}</div>
        </div>
      </div>
      ${togglesHtml}
      ${giveAdminBtn}
      ${pendingNotice}
    </div>`;
}

// Permissions are refreshed on each poll cycle when the panel is open

// Bindings
if (btnPermissions) btnPermissions.onclick = () => {
  if (permissionsOpen) closePermissionsPanel();
  else openPermissionsPanel();
};
if (mpPermBtn) mpPermBtn.onclick = () => {
  closeMobilePlayer();
  if (permissionsOpen) closePermissionsPanel();
  else openPermissionsPanel();
};
if (permClose) permClose.onclick = closePermissionsPanel;
if (permBackdrop) permBackdrop.addEventListener('click', closePermissionsPanel);

// Close when clicking away (but not if inside the panel)
document.addEventListener('click', (e) => {
  if (permissionsOpen && !e.target.closest('.perm-container') && !e.target.closest('#btn-permissions') && !e.target.closest('#mp-perm-btn')) {
    closePermissionsPanel();
  }
});

// ── Boot ──
if (IS_DISCORD_ACTIVITY) {
  // Esconde login e mostra tela de loading da Activity
  document.getElementById('login-screen')?.classList.add('hidden');
  const activityLoading = document.getElementById('activity-loading');
  if (activityLoading) activityLoading.classList.remove('hidden');

  initDiscordActivity()
    .then(() => {
      activityLoading?.classList.add('hidden');
      init();
    })
    .catch(err => {
      console.error('[Activity] Auth failed:', err);
      const loadingText = activityLoading?.querySelector('.activity-loading-text');
      if (loadingText) loadingText.textContent = `Error: ${err?.message || err}`;
    });
} else if (!handleOAuthCallback()) {
  init();
}
