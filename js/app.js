const API_BASE = 'https://pokeapi.co/api/v2';
const IMG_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const MAX_POKEMON = 1025;
const ITEMS_PER_PAGE = 40;

const ULTRA_BEAST_IDS = [793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806];

const NATURES = {
  adamant:  { boost: 'attack', lower: 'special-attack', name: 'Adamant',  pt: 'Adamante' },
  modest:   { boost: 'special-attack', lower: 'attack', name: 'Modest',   pt: 'Modesto' },
  jolly:    { boost: 'speed', lower: 'special-attack', name: 'Jolly',    pt: 'Alegre' },
  timid:    { boost: 'speed', lower: 'attack', name: 'Timid',    pt: 'Tímido' },
  brave:    { boost: 'attack', lower: 'speed', name: 'Brave',    pt: 'Valente' },
  quiet:    { boost: 'special-attack', lower: 'speed', name: 'Quiet',    pt: 'Quieto' },
  bold:     { boost: 'defense', lower: 'attack', name: 'Bold',     pt: 'Ousado' },
  impish:   { boost: 'defense', lower: 'special-attack', name: 'Impish',   pt: 'Malicioso' },
  relaxed:  { boost: 'defense', lower: 'speed', name: 'Relaxed',  pt: 'Relaxado' },
  calm:     { boost: 'special-defense', lower: 'attack', name: 'Calm',     pt: 'Calmo' },
  careful:  { boost: 'special-defense', lower: 'special-attack', name: 'Careful',  pt: 'Cuidadoso' },
  sassy:    { boost: 'special-defense', lower: 'speed', name: 'Sassy',    pt: 'Atrevido' },
  lonely:   { boost: 'attack', lower: 'defense', name: 'Lonely',   pt: 'Solitário' },
  mild:     { boost: 'special-attack', lower: 'defense', name: 'Mild',     pt: 'Brando' },
  hasty:    { boost: 'speed', lower: 'defense', name: 'Hasty',    pt: 'Apressado' },
  gentle:   { boost: 'special-defense', lower: 'defense', name: 'Gentle',   pt: 'Gentil' },
  naughty:  { boost: 'attack', lower: 'special-defense', name: 'Naughty',  pt: 'Malvado' },
  rash:     { boost: 'special-attack', lower: 'special-defense', name: 'Rash',     pt: 'Rude' },
  naive:    { boost: 'speed', lower: 'special-defense', name: 'Naive',    pt: 'Ingênuo' },
  lax:      { boost: 'defense', lower: 'special-defense', name: 'Lax',      pt: 'Nelegente' },
  hardy:    { boost: null, lower: null, name: 'Hardy',    pt: 'Corajoso' },
  docile:   { boost: null, lower: null, name: 'Docile',   pt: 'Dócil' },
  serious:  { boost: null, lower: null, name: 'Serious',  pt: 'Sério' },
  bashful:  { boost: null, lower: null, name: 'Bashful',  pt: 'Reservado' },
  quirky:   { boost: null, lower: null, name: 'Quirky',   pt: 'Estranho' }
};

let allPokemon = [];
let filteredPokemon = [];
let currentPage = 1;
let favorites = JSON.parse(localStorage.getItem('pokedex_favorites') || '[]');
let megaMode = false;
let shinyMode = false;
let currentSort = 'id';
let loadAll = false;

let compareSlot = [null, null]; // 0 = first, 1 = second
let currentCompareSelection = null; // which slot we're filling

// ==================== CACHE ====================
function getCache(key) {
  try {
    const item = localStorage.getItem('pk_cache_' + key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.time > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('pk_cache_' + key);
      return null;
    }
    return parsed.data;
  } catch (e) { return null; }
}

function setCache(key, data) {
  try {
    localStorage.setItem('pk_cache_' + key, JSON.stringify({ time: Date.now(), data }));
  } catch (e) { clearOldCache(); }
}

function clearOldCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('pk_cache_'));
  keys.sort((a, b) => {
    try {
      const ta = JSON.parse(localStorage.getItem(a)).time;
      const tb = JSON.parse(localStorage.getItem(b)).time;
      return ta - tb;
    } catch (e) { return 0; }
  });
  keys.slice(0, Math.floor(keys.length / 2)).forEach(k => localStorage.removeItem(k));
}

function clearCache() {
  Object.keys(localStorage).filter(k => k.startsWith('pk_cache_')).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('pokedex_all_basic');
  allPokemon = [];
  loadAllPokemon();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadBasicList().then(() => {
    hideLoading();
    renderPage();
  });
  updateFavCount();
  initCompareSlots();
});

function initEventListeners() {
  document.getElementById('search-input').addEventListener('input', debounce(() => {
    currentPage = 1; applyFilters();
  }, 300));
  document.getElementById('type-filter').addEventListener('change', () => { currentPage = 1; applyFilters(); });
  document.getElementById('gen-filter').addEventListener('change', () => { currentPage = 1; applyFilters(); });
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ==================== LOADING ====================
function hideLoading() {
  const screen = document.getElementById('loading-screen');
  if (screen) screen.classList.add('hidden');
}

function setLoadingProgress(pct) {
  const bar = document.getElementById('loading-bar-fill');
  if (bar) bar.style.width = pct + '%';
}

// ==================== DATA LOADING ====================
async function loadBasicList() {
  const cached = localStorage.getItem('pokedex_all_basic');
  if (cached) {
    allPokemon = JSON.parse(cached);
    document.getElementById('total-count').textContent = allPokemon.length;
    document.getElementById('loaded-count').textContent = allPokemon.filter(p => p.loaded).length;
    applyFilters();
    return;
  }
  const res = await fetch(`${API_BASE}/pokemon?limit=${MAX_POKEMON}`);
  const data = await res.json();
  allPokemon = data.results.map((r, i) => ({
    id: i + 1,
    name: r.name,
    ptName: null,
    types: [],
    sprite: `${IMG_BASE}/${i + 1}.png`,
    shinySprite: `${IMG_BASE}/shiny/${i + 1}.png`,
    loaded: false,
    gen: getGen(i + 1),
    cries: null,
    stats: null,
    abilities: [],
    height: null,
    weight: null,
    description: null,
    evolution: null,
    mega: false,
    megaData: null,
    ultraBeast: ULTRA_BEAST_IDS.includes(i + 1)
  }));
  localStorage.setItem('pokedex_all_basic', JSON.stringify(allPokemon));
  document.getElementById('total-count').textContent = allPokemon.length;
  applyFilters();
  loadBatch(0, 50);
}

function getGen(id) {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9;
}

async function loadBatch(start, count) {
  const end = Math.min(start + count, MAX_POKEMON);
  const batch = allPokemon.slice(start, end);
  let loaded = 0;
  for (const p of batch) {
    await loadPokemonDetail(p);
    loaded++;
    setLoadingProgress(Math.round(((start + loaded) / MAX_POKEMON) * 100));
  }
  document.getElementById('loaded-count').textContent = allPokemon.filter(p => p.loaded).length;
  if (currentSection() === 'pokedex') renderPage();
  if (end < MAX_POKEMON && loadAll) {
    setTimeout(() => loadBatch(end, 50), 500);
  } else if (end >= MAX_POKEMON) {
    document.getElementById('bottom-loader').classList.add('d-none');
  }
}

async function loadPokemonDetail(p) {
  if (p.loaded) return;
  const cached = getCache('pkm_' + p.id);
  if (cached) {
    Object.assign(p, cached);
    p.loaded = true;
    return;
  }
  try {
    const [res, speciesRes] = await Promise.all([
      fetch(`${API_BASE}/pokemon/${p.id}`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/pokemon-species/${p.id}`).then(r => r.ok ? r.json() : null)
    ]);
    if (!res) return;
    p.types = res.types.map(t => t.type.name);
    p.abilities = res.abilities.map(a => a.ability.name);
    p.height = res.height / 10;
    p.weight = res.weight / 10;
    p.stats = res.stats.map(s => ({ name: s.stat.name, value: s.base_stat }));
    p.cries = res.cries ? (res.cries.latest || res.cries.legacy) : null;
    if (speciesRes) {
      const ptName = speciesRes.names.find(n => n.language.name === 'pt-BR');
      p.ptName = ptName ? ptName.name : null;
      const flavor = speciesRes.flavor_text_entries.find(f => f.language.name === 'pt-BR') ||
                     speciesRes.flavor_text_entries.find(f => f.language.name === 'en');
      p.description = flavor ? flavor.flavor_text.replace(/\n|\f/g, ' ') : '';
      p.evolution = await loadEvolution(speciesRes.evolution_chain?.url);
      // Mega check
      const hasMega = speciesRes.varieties?.some(v => v.pokemon.name.includes('-mega'));
      if (hasMega) {
        p.mega = true;
        p.megaData = await loadMegaData(p.id, speciesRes.varieties);
      }
    }
    p.loaded = true;
    setCache('pkm_' + p.id, { ...p });
  } catch (e) { console.error('Error loading', p.id, e); }
}

async function loadEvolution(url) {
  if (!url) return null;
  try {
    const res = await fetch(url).then(r => r.json());
    const chain = [];
    function traverse(node) {
      const id = node.species.url.split('/').slice(-2, -1)[0];
      chain.push({ id: parseInt(id), name: node.species.name });
      if (node.evolves_to.length) traverse(node.evolves_to[0]);
    }
    traverse(res.chain);
    return chain;
  } catch (e) { return null; }
}

async function loadMegaData(id, varieties) {
  const megaVar = varieties.find(v => v.pokemon.name.includes('-mega'));
  if (!megaVar) return null;
  try {
    const res = await fetch(megaVar.pokemon.url).then(r => r.json());
    return {
      name: res.name,
      sprite: res.sprites.other['official-artwork']?.front_default || res.sprites.front_default,
      shinySprite: res.sprites.other['official-artwork']?.front_shiny || res.sprites.front_shiny,
      types: res.types.map(t => t.type.name),
      stats: res.stats.map(s => ({ name: s.stat.name, value: s.base_stat }))
    };
  } catch (e) { return null; }
}

function loadAllPokemon() {
  loadAll = true;
  document.getElementById('bottom-loader').classList.remove('d-none');
  const loadedCount = allPokemon.filter(p => p.loaded).length;
  if (loadedCount < MAX_POKEMON) loadBatch(loadedCount, 50);
}

// ==================== FILTERING ====================
function applyFilters() {
  const search = document.getElementById('search-input').value.toLowerCase().trim();
  const type = document.getElementById('type-filter').value;
  const gen = document.getElementById('gen-filter').value;

  filteredPokemon = allPokemon.filter(p => {
    if (!megaMode && p.mega && p.name.includes('-mega')) return false;
    const matchesSearch = !search || p.name.toLowerCase().includes(search) ||
      (p.ptName && p.ptName.toLowerCase().includes(search)) ||
      String(p.id).includes(search);
    const matchesType = !type || p.types.includes(type) || (p.megaData && p.megaData.types.includes(type));
    const matchesGen = !gen || String(p.gen) === gen;
    return matchesSearch && matchesType && matchesGen;
  });

  if (currentSort === 'name') {
    filteredPokemon.sort((a, b) => (a.ptName || a.name).localeCompare(b.ptName || b.name, 'pt-BR'));
  } else {
    filteredPokemon.sort((a, b) => a.id - b.id);
  }
  currentPage = 1;
  renderPage();
}

function sortBy(field) {
  currentSort = field;
  applyFilters();
}

function toggleMegas() {
  megaMode = !megaMode;
  const btn = document.getElementById('mega-btn');
  if (megaMode) {
    btn.classList.add('btn-pokedex-primary');
    btn.style.borderColor = 'var(--pokedex-red)';
  } else {
    btn.classList.remove('btn-pokedex-primary');
    btn.style.borderColor = '';
  }
  applyFilters();
}

function toggleShiny() {
  shinyMode = !shinyMode;
  const btn = document.getElementById('shiny-btn');
  btn.classList.toggle('active', shinyMode);
  renderPage();
  if (currentSection() === 'favorites') renderFavorites();
}

function currentSection() {
  if (document.getElementById('pokedex-section').classList.contains('active')) return 'pokedex';
  if (document.getElementById('compare-section').classList.contains('active')) return 'compare';
  if (document.getElementById('quiz-section').classList.contains('active')) return 'quiz';
  return 'favorites';
}

// ==================== RENDERING ====================
function renderPage() {
  const grid = document.getElementById('pokemon-grid');
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredPokemon.slice(start, start + ITEMS_PER_PAGE);

  grid.innerHTML = pageItems.map(p => renderCard(p)).join('');
  renderPagination();
}

function renderCard(p) {
  const isFav = favorites.includes(p.id);
  const sprite = shinyMode ? (p.shinySprite || p.sprite) : p.sprite;
  const primaryType = p.types[0] || 'normal';
  const typeBadges = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
  const displayName = p.ptName || p.name;
  const megaBadge = p.mega ? `<div class="mega-ribbon">MEGA</div>` : '';
  const ultraBadge = p.ultraBeast ? `<div class="ultra-beast-ribbon">ULTRA</div>` : '';
  const cardClass = p.mega ? 'pokemon-card mega-card' : (p.ultraBeast ? 'pokemon-card ultra-beast-card' : 'pokemon-card');

  return `
    <div class="${cardClass}" data-type="${primaryType}" onclick="openPokemon(${p.id})" style="--card-accent:var(--type-${primaryType});--card-glow:var(--type-${primaryType});">
      <div class="card-bg-glow"></div>
      ${megaBadge}
      ${ultraBadge}
      <button class="pokemon-fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation();toggleFav(${p.id})" title="${isFav ? 'Remover' : 'Adicionar'} favorito">
        <i class="fas fa-heart"></i>
      </button>
      <span class="pokemon-id-top">#${String(p.id).padStart(4, '0')}</span>
      <div class="pokemon-sprite-container">
        <img class="pokemon-sprite" src="${sprite}" alt="${p.name}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
      </div>
      <div class="pokemon-name">${displayName}</div>
      <div class="pokemon-types">${typeBadges}</div>
      <span class="gen-badge">Gen ${p.gen}</span>
    </div>
  `;
}

function renderPagination() {
  const total = Math.ceil(filteredPokemon.length / ITEMS_PER_PAGE);
  if (total <= 1) {
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  let html = '';
  if (currentPage > 1) html += `<button class="page-btn" onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(total, startPage + 4);
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  if (currentPage < total) html += `<button class="page-btn" onclick="changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
  document.getElementById('pagination').innerHTML = html;
}

function changePage(p) {
  currentPage = p;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== MODAL ====================
function openPokemon(id) {
  const p = allPokemon.find(x => x.id === id);
  if (!p) return;
  if (!p.loaded) {
    loadPokemonDetail(p).then(() => showModal(p));
  } else {
    showModal(p);
  }
}

function showModal(p) {
  const sprite = shinyMode ? (p.shinySprite || p.sprite) : p.sprite;
  const typeBadges = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
  const statsHtml = p.stats ? p.stats.map(s => `
    <div class="stat-row">
      <span class="stat-label">${statLabel(s.name)}</span>
      <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:0%;background:${statColor(s.name)}" data-width="${Math.min(s.value / 1.5, 100)}"></div></div>
      <span class="stat-value">${s.value}</span>
    </div>
  `).join('') : '';

  const evoHtml = p.evolution ? `
    <div class="mt-4">
      <h6 style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">Evolução</h6>
      <div class="evolution-chain">
        ${p.evolution.map((e, i) => `
          ${i > 0 ? '<span class="evolution-arrow"><i class="fas fa-chevron-right"></i></span>' : ''}
          <div class="evolution-item" onclick="openPokemon(${e.id});closeModalDirect()">
            <img src="${IMG_BASE}/${e.id}.png" alt="${e.name}" loading="lazy">
            <small>${e.name}</small>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const megaHtml = p.mega && p.megaData ? `
    <div class="mt-4">
      <h6 style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">Mega Evolução</h6>
      <div class="d-flex align-items-center gap-3">
        <img src="${shinyMode ? (p.megaData.shinySprite || p.megaData.sprite) : p.megaData.sprite}" style="width:120px;height:120px;object-fit:contain;image-rendering:pixelated" onerror="this.style.display='none'">
        <div>
          <div class="pokemon-name" style="text-transform:capitalize">${p.megaData.name.replace(/-/g, ' ')}</div>
          <div class="pokemon-types">${p.megaData.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('')}</div>
        </div>
      </div>
    </div>
  ` : '';

  const natureHtml = p.stats ? generateNatureTips(p.stats) : '';
  const ultraBadge = p.ultraBeast ? `<span class="info-pill" style="background:linear-gradient(135deg,#FF0055,#cc0044);color:#fff;border:none"><i class="fas fa-biohazard"></i> <strong>Ultra Beast</strong></span>` : '';

  const isFav = favorites.includes(p.id);

  document.getElementById('modal-title').innerHTML = `
    <span style="color:var(--text-muted);font-weight:400">#${String(p.id).padStart(4, '0')}</span> ${p.ptName || p.name}
    <button class="pokemon-fav-btn ${isFav ? 'active' : ''}" style="position:static;display:inline-flex;margin-left:0.5rem" onclick="toggleFav(${p.id});this.classList.toggle('active')">
      <i class="fas fa-heart"></i>
    </button>
  `;
  document.getElementById('modal-body').innerHTML = `
    <div class="text-center mb-4">
      <img class="pokemon-detail-img animate-bounce" src="${sprite}" alt="${p.name}">
      <div class="pokemon-types mt-2">${typeBadges}</div>
    </div>
    <div class="d-flex gap-2 mb-3 flex-wrap">
      <span class="info-pill"><i class="fas fa-ruler-vertical"></i> <strong>${p.height} m</strong></span>
      <span class="info-pill"><i class="fas fa-weight-hanging"></i> <strong>${p.weight} kg</strong></span>
      <span class="info-pill"><i class="fas fa-bolt"></i> <strong>${p.abilities.map(a => a.replace(/-/g, ' ')).join(', ')}</strong></span>
      <span class="info-pill"><i class="fas fa-globe"></i> <strong>Gen ${p.gen}</strong></span>
      ${ultraBadge}
    </div>
    <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.6">${p.description || 'Descrição não disponível.'}</p>
    <div class="mt-3">
      <h6 style="color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">Status</h6>
      ${statsHtml}
    </div>
    <div class="text-center mt-4">
      <button class="cry-btn" onclick="playCry(${p.id})">
        <i class="fas fa-play"></i> Tocar Som
      </button>
    </div>
    ${natureHtml}
    ${evoHtml}
    ${megaHtml}
  `;

  const modal = document.getElementById('pokemon-modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Animate stat bars
  setTimeout(() => {
    modal.querySelectorAll('[data-width]').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 200);
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  closeModalDirect();
}

function closeModalDirect() {
  const modal = document.getElementById('pokemon-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function statLabel(name) {
  const map = { hp: 'HP', attack: 'ATK', defense: 'DEF', 'special-attack': 'SPA', 'special-defense': 'SPD', speed: 'SPE' };
  return map[name] || name.toUpperCase();
}

function statColor(name) {
  const map = { hp: '#FF5959', attack: '#F5AC78', defense: '#FAE078', 'special-attack': '#9DB7F5', 'special-defense': '#A7DB8D', speed: '#FA92B2' };
  return map[name] || '#aaa';
}

// ==================== NATURE TIPS ====================
function generateNatureTips(stats) {
  const sorted = [...stats].sort((a, b) => b.value - a.value);
  const highest = sorted[0].name;
  const lowest = sorted[sorted.length - 1].name;
  const secondHighest = sorted[1].name;

  const recommended = Object.values(NATURES).filter(n => {
    if (!n.boost) return false;
    return n.boost === highest || n.boost === secondHighest;
  }).slice(0, 4);

  if (!recommended.length) return '';

  const tipsHtml = recommended.map(n => {
    const boostName = statLabel(n.boost);
    const lowerName = statLabel(n.lower);
    return `
      <span class="nature-tag">
        ${n.pt} <span class="nature-boost">+${boostName}</span> <span class="nature-lower">-${lowerName}</span>
      </span>
    `;
  }).join('');

  return `
    <div class="nature-tips-container">
      <div class="nature-tips-title"><i class="fas fa-leaf"></i> Dicas de Nature</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem">
        ${tipsHtml}
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;margin-bottom:0">Natures recomendadas com base nos atributos base do Pokémon.</p>
    </div>
  `;
}

// ==================== FAVORITES ====================
function toggleFav(id) {
  const idx = favorites.indexOf(id);
  if (idx > -1) {
    favorites.splice(idx, 1);
    showToast('Removido dos favoritos', 'info');
  } else {
    favorites.push(id);
    showToast('Adicionado aos favoritos!', 'success');
  }
  localStorage.setItem('pokedex_favorites', JSON.stringify(favorites));
  updateFavCount();
  if (currentSection() === 'pokedex') renderPage();
  if (currentSection() === 'favorites') renderFavorites();
}

function updateFavCount() {
  const el = document.getElementById('fav-count');
  const el2 = document.getElementById('fav-total');
  if (el) el.textContent = favorites.length;
  if (el2) el2.textContent = favorites.length;
}

function renderFavorites() {
  const grid = document.getElementById('favorites-grid');
  const empty = document.getElementById('favorites-empty');
  const favs = allPokemon.filter(p => favorites.includes(p.id));
  if (!favs.length) {
    grid.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');
  grid.innerHTML = favs.map(p => renderCard(p)).join('');
}

// ==================== EXPORT / IMPORT FAVORITES ====================
function exportFavoritesJSON() {
  if (!favorites.length) { showToast('Nenhum favorito para exportar', 'warning'); return; }
  const data = favorites.map(id => {
    const p = allPokemon.find(x => x.id === id);
    return p ? { id: p.id, name: p.name, ptName: p.ptName, types: p.types, gen: p.gen } : { id };
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pokedex-favoritos-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Favoritos exportados em JSON!', 'success');
}

function exportFavoritesCSV() {
  if (!favorites.length) { showToast('Nenhum favorito para exportar', 'warning'); return; }
  const rows = favorites.map(id => {
    const p = allPokemon.find(x => x.id === id);
    if (!p) return `${id},,,,`;
    return `${p.id},${p.name},${p.ptName || ''},${p.types.join('/')},${p.gen}`;
  });
  const csv = 'ID,Nome,Nome PT,Tipos,Geração\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pokedex-favoritos-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Favoritos exportados em CSV!', 'success');
}

function importFavorites() {
  document.getElementById('import-file').click();
}

function handleImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let imported = [];
      if (file.name.endsWith('.csv')) {
        const lines = e.target.result.split('\n').slice(1).filter(l => l.trim());
        imported = lines.map(line => {
          const cols = line.split(',');
          return parseInt(cols[0]);
        }).filter(id => !isNaN(id) && id > 0 && id <= MAX_POKEMON);
      } else {
        const data = JSON.parse(e.target.result);
        imported = data.map(item => item.id || item).filter(id => typeof id === 'number' && id > 0 && id <= MAX_POKEMON);
      }
      const newIds = imported.filter(id => !favorites.includes(id));
      favorites = [...new Set([...favorites, ...imported])];
      localStorage.setItem('pokedex_favorites', JSON.stringify(favorites));
      updateFavCount();
      if (currentSection() === 'favorites') renderFavorites();
      if (currentSection() === 'pokedex') renderPage();
      showToast(`${newIds.length} favorito(s) importado(s)!`, 'success');
    } catch (err) {
      showToast('Erro ao importar arquivo', 'error');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

// ==================== COMPARE SYSTEM ====================
function initCompareSlots() {
  const slot1 = document.getElementById('compare-slot-1');
  const slot2 = document.getElementById('compare-slot-2');
  if (slot1) slot1.addEventListener('click', () => openCompareSelect(0));
  if (slot2) slot2.addEventListener('click', () => openCompareSelect(1));
}

function openCompareSelect(slotIndex) {
  currentCompareSelection = slotIndex;
  const modal = document.getElementById('compare-select-modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  document.getElementById('compare-modal-search').value = '';
  renderCompareModalSearch('');
}

function closeCompareSelectModal(e) {
  if (e && e.target !== e.currentTarget) return;
  closeCompareSelectModalDirect();
}

function closeCompareSelectModalDirect() {
  const modal = document.getElementById('compare-select-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function renderCompareModalSearch(query) {
  const grid = document.getElementById('compare-modal-grid');
  const q = query.toLowerCase().trim();
  const items = allPokemon.filter(p => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.ptName && p.ptName.toLowerCase().includes(q)) || String(p.id).includes(q);
  }).slice(0, 30);

  grid.innerHTML = items.map(p => `
    <div class="compare-modal-item" onclick="selectComparePokemon(${p.id})">
      <img src="${p.sprite}" alt="${p.name}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
      <div class="name">${p.ptName || p.name}</div>
      <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.2rem">#${String(p.id).padStart(4,'0')}</div>
    </div>
  `).join('');
}

async function selectComparePokemon(id) {
  const p = allPokemon.find(x => x.id === id);
  if (!p) return;
  if (!p.loaded) await loadPokemonDetail(p);
  compareSlot[currentCompareSelection] = p;
  closeCompareSelectModalDirect();
  updateCompareUI();
}

function updateCompareUI() {
  [0, 1].forEach(idx => {
    const slot = document.getElementById(`compare-slot-${idx + 1}`);
    const placeholder = slot.querySelector('.compare-placeholder');
    const result = slot.querySelector('.compare-result');
    const p = compareSlot[idx];

    if (p) {
      placeholder.classList.add('d-none');
      result.classList.remove('d-none');
      const sprite = shinyMode ? (p.shinySprite || p.sprite) : p.sprite;
      const typeBadges = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
      const totalStats = p.stats ? p.stats.reduce((sum, s) => sum + s.value, 0) : 0;
      result.innerHTML = `
        <div class="compare-result-pokemon">
          <button class="remove-btn" onclick="event.stopPropagation();clearCompareSlot(${idx})" title="Remover">
            <i class="fas fa-times"></i>
          </button>
          <img src="${sprite}" alt="${p.name}">
          <div class="name">${p.ptName || p.name}</div>
          <div class="types">${typeBadges}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem">
            <strong style="color:var(--text-primary)">Total: ${totalStats}</strong>
          </div>
        </div>
      `;
      slot.classList.add('filled');
    } else {
      placeholder.classList.remove('d-none');
      result.classList.add('d-none');
      slot.classList.remove('filled');
    }
  });

  const btn = document.getElementById('compare-btn');
  btn.disabled = !(compareSlot[0] && compareSlot[1]);

  if (compareSlot[0] && compareSlot[1]) {
    runCompare();
  } else {
    document.getElementById('compare-chart').classList.add('d-none');
  }
}

function clearCompareSlot(idx) {
  compareSlot[idx] = null;
  updateCompareUI();
}

function runCompare() {
  const [p1, p2] = compareSlot;
  if (!p1 || !p2) return;
  if (!p1.stats || !p2.stats) {
    showToast('Carregando dados... aguarde!', 'info');
    Promise.all([
      !p1.stats ? loadPokemonDetail(p1) : Promise.resolve(),
      !p2.stats ? loadPokemonDetail(p2) : Promise.resolve()
    ]).then(() => runCompareInternal());
    return;
  }
  runCompareInternal();
}

function runCompareInternal() {
  const [p1, p2] = compareSlot;
  const chart = document.getElementById('compare-chart');
  const statsContainer = document.getElementById('compare-stats');
  const winnerDiv = document.getElementById('compare-winner');

  const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
  const labels = { hp: 'HP', attack: 'ATK', defense: 'DEF', 'special-attack': 'SPA', 'special-defense': 'SPD', speed: 'SPE' };

  let p1Wins = 0;
  let p2Wins = 0;

  const rowsHtml = statNames.map(stat => {
    const v1 = p1.stats.find(s => s.name === stat)?.value || 0;
    const v2 = p2.stats.find(s => s.name === stat)?.value || 0;
    const maxVal = Math.max(v1, v2, 1);
    const w1 = Math.round((v1 / maxVal) * 100);
    const w2 = Math.round((v2 / maxVal) * 100);

    if (v1 > v2) p1Wins++;
    else if (v2 > v1) p2Wins++;

    const v1Class = v1 > v2 ? 'compare-stat-winner' : (v1 < v2 ? 'compare-stat-loser' : '');
    const v2Class = v2 > v1 ? 'compare-stat-winner' : (v2 < v1 ? 'compare-stat-loser' : '');

    return `
      <div class="compare-stat-row">
        <div class="compare-stat-value ${v1Class}">${v1}</div>
        <div class="compare-stat-bar-wrapper left">
          <div class="compare-stat-bar"><div class="compare-stat-bar-fill left" style="width:${w1}%" data-width="${w1}"></div></div>
        </div>
        <div class="compare-stat-name">${labels[stat]}</div>
        <div class="compare-stat-bar-wrapper right">
          <div class="compare-stat-bar"><div class="compare-stat-bar-fill right" style="width:${w2}%" data-width="${w2}"></div></div>
        </div>
        <div class="compare-stat-value ${v2Class}">${v2}</div>
      </div>
    `;
  }).join('');

  const total1 = p1.stats.reduce((s, x) => s + x.value, 0);
  const total2 = p2.stats.reduce((s, x) => s + x.value, 0);

  let winnerText = '';
  if (p1Wins > p2Wins) {
    winnerText = `<div class="compare-winner-text"><i class="fas fa-trophy"></i> ${p1.ptName || p1.name} vence!</div>`;
  } else if (p2Wins > p1Wins) {
    winnerText = `<div class="compare-winner-text"><i class="fas fa-trophy"></i> ${p2.ptName || p2.name} vence!</div>`;
  } else {
    winnerText = `<div class="compare-winner-text"><i class="fas fa-handshake"></i> Empate!</div>`;
  }

  statsContainer.innerHTML = rowsHtml;
  winnerDiv.innerHTML = `
    ${winnerText}
    <div class="compare-winner-sub">
      ${p1.ptName || p1.name}: ${total1} total · ${p1Wins} stats vencedores<br>
      ${p2.ptName || p2.name}: ${total2} total · ${p2Wins} stats vencedores
    </div>
  `;

  chart.classList.remove('d-none');

  setTimeout(() => {
    chart.querySelectorAll('[data-width]').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 100);

  window.scrollTo({ top: chart.offsetTop - 100, behavior: 'smooth' });
}

function renderCompareSearch(query) {
  const container = document.getElementById('compare-search-results');
  const q = query.toLowerCase().trim();
  if (!q) { container.innerHTML = ''; return; }
  const items = allPokemon.filter(p => {
    return p.name.toLowerCase().includes(q) || (p.ptName && p.ptName.toLowerCase().includes(q)) || String(p.id).includes(q);
  }).slice(0, 15);

  container.innerHTML = items.map(p => `
    <div class="compare-search-item" onclick="selectComparePokemon(${p.id})">
      <img src="${p.sprite}" alt="${p.name}" loading="lazy">
      <div class="name">${p.ptName || p.name}</div>
    </div>
  `).join('');
}

// ==================== TOAST ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const colors = { success: '#2ecc71', error: '#e74c3c', warning: '#f39c12', info: '#3498db' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: var(--pokedex-glass);
    backdrop-filter: blur(20px);
    border: 1px solid ${colors[type] || colors.info};
    color: var(--text-primary);
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm);
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    animation: fadeIn 0.3s ease;
    pointer-events: all;
    display: flex; align-items: center; gap: 0.5rem;
  `;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-circle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== AUDIO ====================
function playCry(id) {
  const p = allPokemon.find(x => x.id === id);
  if (!p) return;
  if (p.cries) {
    const audio = new Audio(p.cries);
    audio.play().catch(() => fallbackCry(p));
  } else {
    fallbackCry(p);
  }
}

function fallbackCry(p) {
  const name = p.name || p.id;
  const audio = new Audio(`https://play.pokemonshowdown.com/audio/cries/${name}.mp3`);
  audio.play().catch(() => {
    const a2 = new Audio(`https://play.pokemonshowdown.com/audio/cries/${p.id}.mp3`);
    a2.play().catch(() => showToast('Som não disponível', 'warning'));
  });
}

// ==================== NAVIGATION ====================
function showSection(section) {
  document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
  document.getElementById(section + '-section').classList.add('active');
  document.querySelectorAll('.nav-link-custom').forEach(a => a.classList.remove('active'));
  const activeLink = document.querySelector(`a[onclick="showSection('${section}')"]`);
  if (activeLink) activeLink.classList.add('active');

  if (section === 'favorites') renderFavorites();
  if (section === 'pokedex') renderPage();
  if (section === 'compare') updateCompareUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== QUIZ ====================
let quizState = { mode: null, score: 0, current: 0, questions: [], answer: null };

function startQuiz(mode) {
  quizState = { mode, score: 0, current: 0, questions: [], answer: null };
  const loaded = allPokemon.filter(p => p.loaded);
  if (loaded.length < 20) {
    showToast('Carregue mais Pokémon primeiro! Clique em "Carregar Tudo"', 'warning');
    return;
  }
  const shuffled = [...loaded].sort(() => 0.5 - Math.random());
  quizState.questions = shuffled.slice(0, 10);
  document.getElementById('quiz-start').classList.add('d-none');
  document.getElementById('quiz-game').classList.remove('d-none');
  document.getElementById('quiz-end').classList.add('d-none');
  nextQuestion();
}

function nextQuestion() {
  quizState.current++;
  if (quizState.current > 10) { endQuiz(); return; }
  const q = quizState.questions[quizState.current - 1];
  quizState.answer = q.id;
  document.getElementById('quiz-score').textContent = quizState.score;
  document.getElementById('quiz-current').textContent = quizState.current;
  document.getElementById('quiz-result').innerHTML = '';
  document.getElementById('quiz-next').classList.add('d-none');

  const content = document.getElementById('quiz-content');
  const options = document.getElementById('quiz-options');

  if (quizState.mode === 'name') {
    content.innerHTML = `<img src="${q.sprite}" class="pokemon-detail-img animate-bounce" style="width:200px;height:200px">`;
  } else if (quizState.mode === 'shadow') {
    content.innerHTML = `<img src="${q.sprite}" class="pokemon-detail-img quiz-shadow" style="width:200px;height:200px">`;
  } else if (quizState.mode === 'cry') {
    content.innerHTML = `
      <button class="cry-btn" onclick="playCry(${q.id})">
        <i class="fas fa-play"></i> Tocar Som
      </button>
      <div class="audio-wave justify-content-center" style="display:flex;margin-top:0.5rem">
        <span></span><span></span><span></span><span></span><span></span>
      </div>`;
    setTimeout(() => playCry(q.id), 500);
  }

  const wrong = allPokemon.filter(p => p.loaded && p.id !== q.id).sort(() => 0.5 - Math.random()).slice(0, 3);
  const opts = [...wrong, q].sort(() => 0.5 - Math.random());
  options.innerHTML = opts.map(o => `
    <button class="quiz-option" onclick="answerQuiz(${o.id}, this)">
      ${o.ptName || o.name}
    </button>
  `).join('');
}

function answerQuiz(id, btn) {
  const buttons = document.querySelectorAll('.quiz-option');
  buttons.forEach(b => {
    b.disabled = true;
    const name = b.textContent.trim();
    const pokemon = allPokemon.find(p => (p.ptName || p.name) === name);
    if (pokemon && pokemon.id === quizState.answer) {
      b.classList.add('correct');
      b.innerHTML += ' <i class="fas fa-check"></i>';
    }
  });

  const isCorrect = id === quizState.answer;
  if (isCorrect) {
    quizState.score++;
    document.getElementById('quiz-result').innerHTML = '<span style="color:#2ecc71;font-weight:700"><i class="fas fa-check-circle"></i> Correto!</span>';
  } else {
    btn.classList.add('wrong');
    btn.innerHTML += ' <i class="fas fa-times"></i>';
    document.getElementById('quiz-result').innerHTML = '<span style="color:#e74c3c;font-weight:700"><i class="fas fa-times-circle"></i> Errado!</span>';
  }
  document.getElementById('quiz-score').textContent = quizState.score;
  document.getElementById('quiz-next').classList.remove('d-none');
}

function endQuiz() {
  document.getElementById('quiz-game').classList.add('d-none');
  document.getElementById('quiz-end').classList.remove('d-none');
  document.getElementById('final-score').textContent = quizState.score;
}

function resetQuiz() {
  document.getElementById('quiz-start').classList.remove('d-none');
  document.getElementById('quiz-game').classList.add('d-none');
  document.getElementById('quiz-end').classList.add('d-none');
}
