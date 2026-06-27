// --- CONFIGURATION SUPABASE ---
const SB_URL = "https://ldcxwcjtceezttiogarp.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkY3h3Y2p0Y2VlenR0aW9nYXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDE1NzIsImV4cCI6MjA5NzcxNzU3Mn0.qWHlILHoHS9cbAvUTj_KmkyL2h9oxnHeFhOBrOAC_hg";
const sb = supabase.createClient(SB_URL, SB_KEY);

// --- VARIABLES GLOBALES ---
const STORAGE_BUCKET = "images"; 
const GLOBAL_CODE = "Crevette";
let currentUser = null;
let selectedItemId = null;
let itemsData = [];
let activeCategory = "all"; 
let chosenResMode = 'public'; 
let catConfig = {}; 
let filterAvailableOnly = {};

// 🚀 INITIALISATION COMPLÈTE DE L'APPLICATION
document.addEventListener('DOMContentLoaded', async () => {
  const stepGlobal = document.getElementById('step-global');
  const stepAuth = document.getElementById('step-auth');

  if (localStorage.getItem('family_unlocked') === 'true') {
    if (stepGlobal) stepGlobal.style.display = 'none';
    const { data: { session } } = await sb.auth.getSession();
    
    if (session) {
      currentUser = session.user;
      if (stepAuth) stepAuth.style.display = 'none';
      initApp(); 
    } else {
      if (stepAuth) stepAuth.style.display = 'flex';
    }
  } else {
    if (stepGlobal) stepGlobal.style.display = 'flex';
  }
});

// --- CARROUSEL ---
let slideIndex = 0;
function rotateCarousel() {
  const slides = document.querySelectorAll('.carousel-slide');
  if(!slides.length) return;
  slides.forEach(s => s.style.opacity = 0);
  slides[slideIndex].style.opacity = 1;
  slideIndex = (slideIndex + 1) % slides.length;
}
setInterval(rotateCarousel, 4000);

// --- PALETTE PASTEL DOUCES ---
const pastelThemes = [
  { bg: '#EAF4FC', border: '#CBE3F5', text: '#1F618D' }, 
  { bg: '#FCF3CF', border: '#F9E79F', text: '#B7950B' }, 
  { bg: '#F5EBE8', border: '#E6D5CF', text: '#5C544D' }, 
  { bg: '#EAF6F3', border: '#D1EAE2', text: '#2E86C1' }, 
  { bg: '#E0F2F1', border: '#A2D9CE', text: '#00838F' }, 
  { bg: '#EBF5FB', border: '#A9CCE3', text: '#34495E' }, 
  { bg: '#FDF2E9', border: '#FADBD8', text: '#A04000' }, 
  { bg: '#F4ECF7', border: '#D7BDE2', text: '#6C3483' }, 
  { bg: '#F9EBEA', border: '#F5CBA7', text: '#A93226' }, 
  { bg: '#F2F3F4', border: '#E5E7E9', text: '#5D6D7E' }  
];

function checkGlobalPass() {
  if (document.getElementById('pass-global').value === GLOBAL_CODE) {
    localStorage.setItem('family_unlocked', 'true');
    document.getElementById('step-global').style.display = 'none';
    document.getElementById('step-auth').style.display = 'flex';
  } else { alert("Code incorrect"); }
}

async function handleRegister() {
  const prenomRaw = document.getElementById('reg-prenom').value.trim();
  const password = document.getElementById('reg-pass').value;
  const surnom = document.getElementById('reg-surnom').value.trim();

  if (!prenomRaw || !password) { alert("Veuillez remplir votre prénom et choisir un mot de passe !"); return; }

  const cleanPrenom = prenomRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
  const emailTechnique = `${cleanPrenom}@liste.bebe`;

  const { data, error } = await sb.auth.signUp({ email: emailTechnique, password: password });
  
  if (error) { 
    if (error.message.includes("already exists") || error.status === 422) {
      alert("Ce prénom est déjà enregistré ! Si c'est vous, utilisez la section 'Se connecter' en dessous. 😉");
    } else { alert("Erreur d'inscription : " + error.message); }
    return; 
  }
  
  if (data && data.user) {
    currentUser = data.user;
    await sb.from('profiles').upsert([{ id: currentUser.id, prenom: prenomRaw, surnom: surnom || null, is_admin: false }]);
    alert(`Bienvenue ${prenomRaw} ! Votre compte est créé. 🎉`);
    document.getElementById('step-auth').style.display = 'none';
    initApp();
  }
}

async function handleLogin() {
  const prenomRaw = document.getElementById('login-prenom').value.trim();
  const password = document.getElementById('login-pass').value;

  if (!prenomRaw || !password) { alert("Veuillez remplir votre prénom et votre mot de passe !"); return; }

  const cleanPrenom = prenomRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
  const emailTechnique = `${cleanPrenom}@liste.bebe`;

  const { data, error } = await sb.auth.signInWithPassword({ email: emailTechnique, password: password });
  if (error) { alert("Prénom ou mot de passe incorrect."); return; }
  
  if (data && data.user) {
    currentUser = data.user;
    document.getElementById('step-auth').style.display = 'none';
    initApp();
  }
}

async function handleLogout() {
  const confirmation = confirm("Souhaitez-vous vous déconnecter de la liste ?");
  if (!confirmation) return;
  const { error } = await sb.auth.signOut();
  if (!error) {
    currentUser = null; itemsData = []; activeCategory = "all"; filterAvailableOnly = {};
    document.getElementById('app').style.display = 'none';
    document.getElementById('step-auth').style.display = 'flex';
    document.getElementById('login-prenom').value = ""; document.getElementById('login-pass').value = "";
    alert("Vous êtes déconnecté ! À bientôt. 👋");
  }
}

async function initApp() {
  document.getElementById('app').style.display = 'flex';
  rotateCarousel();

  // ⚙️ CORRECTION ICI : On cherche tous les éléments avec la classe .admin-trigger
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', currentUser.id).single();
  if (profile?.is_admin) { 
    document.querySelectorAll('.admin-trigger').forEach(el => el.classList.remove('hidden'));
  }

  const { data: cats } = await sb.from('categories').select('*');
  catConfig['all'] = { id: 'all', label: 'Tout', emoji: '✨', bg: '#F0F7FA', border: '#D4E6F1', text: '#2980B9' };
  
  if (cats) {
    cats.forEach((c, index) => {
      const theme = pastelThemes[index % pastelThemes.length];
      catConfig[c.id] = { id: c.id, label: c.nom, emoji: c.icon || '📦', bg: theme.bg, border: theme.border, text: theme.text };
    });
  }

  renderCategoryBar();
  await loadItems();
}

function initScrollListener() {}

// --- DOUBLE RENDU DES CATÉGORIES CORRIGÉ (DYNAMIQUE PC & 5 COLS FAB) ---
function renderCategoryBar() {
  const deskBar = document.getElementById('desktop-category-bar');
  const mobBar = document.getElementById('mobile-category-bar');
  if (deskBar) deskBar.innerHTML = '';
  if (mobBar) mobBar.innerHTML = '';

  Object.values(catConfig).forEach(c => {
    const isActive = (activeCategory === c.id);
    let shortLabel = c.label;
    if (shortLabel.toLowerCase().includes("maternité")) shortLabel = "À la mat";
    else shortLabel = shortLabel.replace(/^(À la |A la |La |Le |L'|Les )/i, "").substring(0, 11);

    // 1. Cible Ordinateur (flex-1 min-w-0 = s'ajuste parfaitement sur 1 seule ligne !)
    if (deskBar) {
      const btnDesk = document.createElement('button');
      
      // CLASSES CORRIGÉES : Tailles de texte plus petites (text-[7px] à text-[10px] max) et lettres resserrées (tracking-tight)
      btnDesk.className = `flex-1 min-w-0 px-1 md:px-1.5 lg:px-2 py-2 rounded-xl text-[6px] md:text-[7px] lg:text-[9px] xl:text-[10px] font-black uppercase tracking-tight flex items-center justify-center gap-1 lg:gap-1.5 transition-all cursor-pointer select-none shadow-2xs ${isActive ? 'border scale-105 shadow-md z-10' : 'border bg-white hover:bg-stone-50 opacity-80 hover:opacity-100'}`;
      
      btnDesk.style.borderColor = isActive ? c.text : c.border;
      btnDesk.style.color = c.text;
      if (isActive) btnDesk.style.backgroundColor = c.bg;

      btnDesk.onclick = () => selectCategoryAction(c.id);
      
      // L'emoji ne grossit plus de façon excessive et le texte a la place de s'afficher (truncate min-w-0)
      btnDesk.innerHTML = `<span class="text-xs lg:text-sm xl:text-base shrink-0">${c.emoji}</span> <span class="truncate min-w-0">${c.label}</span>`;
      deskBar.appendChild(btnDesk);
    }

    // 2. Cible Mobile (Capsules rondes w-14 dans le FAB Sheet)
    if (mobBar) {
      const btnMob = document.createElement('button');
      btnMob.className = "flex flex-col items-center justify-center outline-none group cursor-pointer transition select-none";
      btnMob.onclick = () => selectCategoryAction(c.id);

      const circleStyle = isActive ? `background: ${c.bg}; border-color: ${c.border}; color: ${c.text}; transform: scale(1.08); box-shadow: 0 4px 6px rgba(0,0,0,0.06);` : `background: #FFFFFF; border-color: #E2E8F0; color: #78716C;`;
      const textStyle = isActive ? `color: ${c.text}; font-weight: 800;` : `color: #A8A29E; font-weight: 700;`;

      btnMob.innerHTML = `
        <div class="w-14 h-14 flex items-center justify-center rounded-full text-2xl border-2 transition-all duration-300 shadow-2xs mx-auto" style="${circleStyle}">${c.emoji}</div>
        <span class="text-[9px] uppercase tracking-wider mt-1.5 transition-colors text-center leading-tight truncate w-full" style="${textStyle}">${shortLabel}</span>
      `;
      mobBar.appendChild(btnMob);
    }
  });

const fab = document.getElementById('category-fab');
  if (fab) {
    const conf = catConfig[activeCategory] || catConfig['all'];
    fab.innerHTML = conf.emoji;
    fab.style.backgroundColor = conf.bg || '#FFFFFF'; // Le fond coloré pastel
    fab.style.borderColor = conf.border || '#7FB3D5';
    fab.style.color = conf.text || '#2980B9'; // Pour que les éventuels textes/icônes suivent
  }
}

function selectCategoryAction(catId) {
  activeCategory = catId;
  renderCategoryBar();
  renderItemsLayout();
  closeCategorySheet();
  window.scrollTo({ top: 220, behavior: 'smooth' });
}

function openCategorySheet() {
  document.getElementById('category-backdrop').classList.remove('opacity-0', 'pointer-events-none');
  document.getElementById('category-sheet').classList.remove('translate-y-full');
}

function closeCategorySheet() {
  document.getElementById('category-backdrop').classList.add('opacity-0', 'pointer-events-none');
  document.getElementById('category-sheet').classList.add('translate-y-full');
}

async function loadItems() {
  const { data: items, error: err1 } = await sb.from('items').select('*').order('nom', { ascending: true });
  const { data: reservations } = await sb.from('reservations').select('*');
  const { data: profiles } = await sb.from('profiles').select('*');

  if (err1) { alert("Erreur chargement : " + err1.message); return; }

  if (items) {
    itemsData = items.map(item => {
      const itemRes = reservations ? reservations.filter(r => r.item_id === item.id) : [];
      if (itemRes.length > 0) {
        const res = itemRes[0];
        res.profiles = profiles ? profiles.find(p => p.id === res.user_id) : null;
      }
      item.reservations = itemRes; 
      return item;
    });
    renderItemsLayout();
  }
}

function toggleAvailableFilter(catId) {
  filterAvailableOnly[catId] = !filterAvailableOnly[catId];
  renderItemsLayout();
}

// --- CONSTRUCTEUR DE GRILLE RESPONSIVE ---
function renderItemsLayout() {
  const container = document.getElementById('list-container');
  if (!container) return;
  container.innerHTML = '';

  const isAll = activeCategory === 'all';
  const catsToRender = isAll ? Object.keys(catConfig).filter(k => k !== 'all') : [activeCategory];
  
  const masterWelcomeCard = `
    <div class="lg:hidden w-full bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-[#D4E6F1] shadow-2xs text-left mb-8 select-text relative overflow-hidden">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-black text-stone-800 text-xs md:text-sm uppercase tracking-wider">Chère famille et chers amis, ✨</h3>
        <span class="text-3xl md:text-4xl animate-wave inline-block">🧸</span>
      </div>
      <p class="text-xs md:text-sm text-stone-500 leading-relaxed mb-5 font-medium">
        Vous l'attendiez avec impatience ? (ou pas 😅) Voici la liste de naissance pour notre crevette d'amour 🐣 ! Aucune obligation, seulement des idées pour vous éviter les doublons (et limiter la fièvre acheteuse 🤪). <br><br>
        Un grand merci d'avance pour toutes vos délicates attentions et votre accompagnement dans cette belle aventure. On vous embrasse et on a hâte de vous retrouver... à 3 du coup bientôt 🥰
      </p>
      <div class="pt-3 border-t border-stone-100 text-xs md:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span class="font-black text-[#2980B9]">📍 Besoin de notre adresse pour une livraison ?</span>
          <p class="text-stone-600 font-bold mt-0.5">Gaëlle RAUD & Olivier CADIOU • 30 Quai de la Bataille, 54000 Nancy</p>
        </div>
      </div>
    </div>
  `;

  let structureHtml = masterWelcomeCard;

  catsToRender.forEach(catId => {
    const allCatItems = itemsData.filter(item => item.cat_id === catId);
    if (allCatItems.length === 0) return; 

    const conf = catConfig[catId];
    const totalCount = allCatItems.length;
    const availableItems = allCatItems.filter(item => !item.reservations || item.reservations.length === 0);
    const availableCount = availableItems.length;

    const isFiltered = filterAvailableOnly[catId] || false;
    const itemsToRender = isFiltered ? availableItems : allCatItems;

    const badgeStyle = isFiltered 
      ? `background: ${conf.text}; color: white; border-color: ${conf.text};` 
      : `background: white; color: ${conf.text}; border-color: ${conf.border};`;

    structureHtml += `
      <div class="w-full rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 border-2 shadow-xs mb-8 transition-all duration-300" style="background: ${conf.bg}; border-color: ${conf.border};">
        <div class="flex items-center justify-between py-1 px-1">
          <div class="flex items-center gap-2 md:gap-3">
            <span class="text-2xl md:text-3xl">${conf.emoji}</span>
            <h3 class="font-black text-sm md:text-base uppercase tracking-wider" style="color: ${conf.text}">${conf.label}</h3>
          </div>
          <button onclick="toggleAvailableFilter('${catId}')" class="px-3 md:px-4 py-1.5 md:py-2 border text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl shadow-2xs cursor-pointer transition-all hover:scale-105 active:scale-95" style="${badgeStyle}">
            🎁 dispo ${availableCount} / ${totalCount}
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 mt-6">
          ${itemsToRender.length > 0 
            ? itemsToRender.map(item => renderItemCard(item)).join('') 
            : `<div class="col-span-full text-center text-xs font-bold uppercase tracking-wider py-8 opacity-60" style="color: ${conf.text};">Tout a été réservé ici ! 🥳</div>`}
        </div>
      </div>
    `;
  });

  if (isAll) {
    const allOrphans = itemsData.filter(item => !catConfig[item.cat_id]);
    if (allOrphans.length > 0) {
      const totalOrphans = allOrphans.length;
      const availableOrphans = allOrphans.filter(item => !item.reservations || item.reservations.length === 0);
      const availableCount = availableOrphans.length;
      const isFiltered = filterAvailableOnly['orphans'] || false;
      const itemsToRender = isFiltered ? availableOrphans : allOrphans;

      const badgeStyle = isFiltered ? `background: #5D6D7E; color: white;` : `background: white; color: #5D6D7E; border-color: #E5E7E9;`;

      structureHtml += `
        <div class="w-full rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 border-2 shadow-xs mb-8" style="background: #F2F3F4; border-color: #E5E7E9;">
          <div class="flex items-center justify-between py-1 px-1">
            <div class="flex items-center gap-2 md:gap-3"><span class="text-2xl md:text-3xl">📦</span><h3 class="font-black text-sm md:text-base uppercase tracking-wider text-[#5D6D7E]">Inclassables</h3></div>
            <button onclick="toggleAvailableFilter('orphans')" class="px-3 md:px-4 py-1.5 md:py-2 border text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl shadow-2xs cursor-pointer transition-all" style="${badgeStyle}">
              🎁 dispo ${availableCount} / ${totalOrphans}
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 mt-6">
            ${itemsToRender.length > 0 ? itemsToRender.map(item => renderItemCard(item)).join('') : `<div class="col-span-full text-center text-xs font-bold uppercase tracking-wider py-8 text-[#5D6D7E] opacity-60">Tout a été réservé ici ! 🥳</div>`}
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = structureHtml;
}

function renderItemCard(item) {
  const isReserved = item.reservations && item.reservations.length > 0;
  const res = isReserved ? item.reservations[0] : null;
  const imgUrl = item.photo_url || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&q=80"; 
  const title = item.nom || "Cadeau";
  const price = item.prix || "0";
  const itemUrl = item.lien || "";
  
  let linkButtonHtml = "";
  if (itemUrl !== "") {
    linkButtonHtml = `<a href="${itemUrl}" target="_blank" class="w-10 h-10 rounded-full bg-white hover:bg-[#EAF4FC] text-[#2980B9] flex items-center justify-center border border-[#D4E6F1] transition hover:scale-105 shrink-0 text-sm shadow-sm" title="Site internet">🔗</a>`;
  }

  const catColor = catConfig[item.cat_id]?.text || '#2980B9';
  const catBorder = catConfig[item.cat_id]?.border || '#D4E6F1';

  let statusBadge = isReserved 
    ? `<div class="bg-[#F5EBE8] border border-[#E6D5CF] text-[#5C544D] text-right text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-2xs shrink-0 my-auto leading-tight">🔒 Bloqué<br><span class="text-[8px] font-normal opacity-75">par ${getReserverDisplay(res)}</span></div>`
    : `<div class="bg-white border border-[#7FB3D5] text-[#2980B9] text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl shadow-2xs shrink-0 my-auto">✨ Dispo</div>`;

  let actionButtonHtml = "";
  if (!isReserved) {
    actionButtonHtml = `<button onclick="event.stopPropagation(); openReservationModal('${item.id}')" class="w-10 h-10 rounded-full bg-[#E0F2FE] hover:bg-[#CBE3F5] text-[#2980B9] border border-[#7FB3D5] flex items-center justify-center shrink-0 transition hover:scale-105 shadow-sm text-sm cursor-pointer" title="Réserver">🎁</button>`;
  } else {
    const isMyReservation = res.user_id === currentUser?.id;
    const isAdminVisible = !document.getElementById('master-btn')?.classList.contains('hidden');

    if (isMyReservation || isAdminVisible) {
      actionButtonHtml = `<button onclick="event.stopPropagation(); cancelReservation('${item.id}')" class="w-10 h-10 rounded-full bg-[#F9EBEA] hover:bg-[#FADBD8] text-[#A93226] border border-[#F5CBA7] flex items-center justify-center shrink-0 transition hover:scale-105 shadow-sm text-sm cursor-pointer" title="Annuler ma réservation">🚫</button>`;
    } else {
      actionButtonHtml = `<button class="w-10 h-10 rounded-full bg-[#F5EBE8] text-[#5C544D] border border-[#E6D5CF] flex items-center justify-center shrink-0 cursor-not-allowed text-xs shadow-sm" disabled>🔒</button>`;
    }
  }

  return `
    <div onclick="showDetail('${item.id}')" class="w-full bg-white rounded-2xl p-4 border border-white shadow-sm flex flex-col transition hover:scale-[1.01] hover:shadow-md cursor-pointer text-left">
      <div class="flex justify-between items-center w-full gap-2 mb-2.5">
        <h4 class="font-black text-stone-800 text-sm md:text-base truncate flex-1" title="${title}">${title}</h4>
        ${statusBadge}
      </div>
      <div class="w-full aspect-[9/10] bg-[#F8FAFC] rounded-xl border border-stone-100 mb-3 overflow-hidden flex items-center justify-center shadow-inner">
        <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&q=80';" class="w-full h-full object-contain p-2">
      </div>
      <div class="flex items-center w-full gap-2 mt-auto" onclick="event.stopPropagation();">
        <div class="bg-white border px-3 py-2 rounded-xl flex items-center gap-1 text-xs shrink-0 mr-auto shadow-sm" style="border-color: ${catBorder}">
          <span class="font-black" style="color: ${catColor}">Prix :</span>
          <span class="font-black" style="color: ${catColor}">${price} €</span>
        </div>
        ${linkButtonHtml}
        ${actionButtonHtml}
      </div>
    </div>
  `;
}

function getReserverDisplay(reservation) {
  if (!reservation) return "Un proche";
  if (reservation.mode_prive === 'anonyme') return "Anonyme";
  if (reservation.mode_prive === 'pseudonyme') return reservation.pseudo_name || "Un proche";
  return reservation.profiles ? (reservation.profiles.surnom || reservation.profiles.prenom) : "Un proche";
}

// === FONCTION HELPER : RÉCUPÉRER LA LISTE DES CADEAUX AFFICHÉS ===
function getVisibleItems() {
  const isAll = activeCategory === 'all';
  const catsToRender = isAll ? Object.keys(catConfig).filter(k => k !== 'all') : [activeCategory];
  let visibleList = [];

  catsToRender.forEach(catId => {
    const allCatItems = itemsData.filter(item => item.cat_id === catId);
    const isFiltered = filterAvailableOnly[catId] || false;
    const itemsToRender = isFiltered ? allCatItems.filter(item => !item.reservations || item.reservations.length === 0) : allCatItems;
    visibleList.push(...itemsToRender);
  });

  if (isAll) {
    const allOrphans = itemsData.filter(item => !catConfig[item.cat_id]);
    if (allOrphans.length > 0) {
      const isFiltered = filterAvailableOnly['orphans'] || false;
      const itemsToRender = isFiltered ? allOrphans.filter(item => !item.reservations || item.reservations.length === 0) : allOrphans;
      visibleList.push(...itemsToRender);
    }
  }
  return visibleList;
}

async function showDetail(id) {
  selectedItemId = id; 
  const item = itemsData.find(i => i.id === id);
  if(!item) return;
  
  // LOGIQUE DE NAVIGATION (Précédent / Suivant)
  const visibleItems = getVisibleItems();
  const currentIndex = visibleItems.findIndex(i => i.id === id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < visibleItems.length - 1;
  const prevId = hasPrev ? visibleItems[currentIndex - 1].id : null;
  const nextId = hasNext ? visibleItems[currentIndex + 1].id : null;

  const res = item.reservations && item.reservations[0];
  const isReserved = !!res;
  
  let isAdmin = false;
  let isMyReservation = false;

  if (currentUser) {
    const { data: currentProfile } = await sb.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    isAdmin = currentProfile?.is_admin || false;
    isMyReservation = isReserved && res.user_id === currentUser.id;
  }

  let actionButtonHtml = "";
  if (!isReserved) {
    actionButtonHtml = `<button onclick="openReservationModal('${item.id}')" class="flex-1 py-4 bg-[#E0F2FE] hover:bg-[#CBE3F5] text-[#2980B9] border border-[#7FB3D5] rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition active:scale-95 cursor-pointer">🎁 Réserver ce cadeau</button>`;
  } else if (isMyReservation || isAdmin) {
    actionButtonHtml = `<button onclick="cancelReservation('${item.id}')" class="flex-1 py-4 bg-[#F9EBEA] border border-[#F5CBA7] text-[#A93226] hover:bg-[#FADBD8] rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition active:scale-95 cursor-pointer">🚫 Annuler ma réservation</button>`;
  } else {
    actionButtonHtml = `<button disabled class="flex-1 py-4 bg-[#F5EBE8] border border-[#E6D5CF] text-[#5C544D] rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed shadow-sm">🔒 Déjà réservé</button>`;
  }

  let adminButtonsHtml = "";
  if (isAdmin) {
    adminButtonsHtml = `
      <div class="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-stone-100">
        <button onclick="showEditForm('${item.id}')" class="flex-1 py-3 bg-[#FEF9E7] hover:bg-[#FCF3CF] text-[#B7950B] border border-[#F9E79F] rounded-xl font-black text-xs uppercase tracking-widest shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2">⚙️ Modifier</button>
        <button onclick="deleteItem('${item.id}')" class="flex-1 py-3 bg-[#F9EBEA] hover:bg-[#FADBD8] text-[#A93226] border border-[#F5CBA7] rounded-xl font-black text-xs uppercase tracking-widest shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2">🗑️ Supprimer</button>
      </div>
    `;
  }

  const panel = document.getElementById('details-panel');
  const contentEl = document.getElementById('details-content');
  panel.style.display = 'flex';
  document.body.classList.add('overflow-hidden'); // 🔒 Bloque le scroll

  const defaultTeddy = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80";
  const imgUrl = (item.photo_url && item.photo_url.trim() !== "") ? item.photo_url : defaultTeddy;

  let texteCommentaireHTML = "";
  if (item.description) { texteCommentaireHTML = item.description.replace(/(?:\r\n|\r|\n)/g, '<br>'); }
  
  const catColor = catConfig[item.cat_id]?.text || '#2980B9';
  const catBorder = catConfig[item.cat_id]?.border || '#D4E6F1';
  const catBg = catConfig[item.cat_id]?.bg || '#F0F7FA';
  const catEmoji = catConfig[item.cat_id]?.emoji || '✨';
  contentEl.style.borderColor = catBorder;

  contentEl.innerHTML = `
    <div class="mb-4 text-left">
      <button onclick="closeDetails()" class="bg-stone-100 border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-2 hover:bg-stone-200 transition cursor-pointer">← Retour</button>
    </div>
    
    <div class="relative w-full mb-6 flex items-center justify-center group">
      ${hasPrev ? `
      <button onclick="showDetail('${prevId}')" class="hidden md:flex absolute left-2 lg:-left-2 z-10 w-10 h-10 lg:w-12 lg:h-12 items-center justify-center rounded-full border-2 bg-white shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer" style="border-color: ${catBorder}; color: ${catColor};" onmouseover="this.style.backgroundColor='${catBg}'" onmouseout="this.style.backgroundColor='white'" title="Cadeau précédent">
<span class="text-sm lg:text-base ml-[-2px]">◀</span>
</button>` : ''}

<img src="${imgUrl}" onerror="this.onerror=null; this.src='${defaultTeddy}';" class="w-full h-auto max-h-[45vh] object-contain rounded-2xl shadow-sm block mx-auto bg-stone-50 p-2 border" style="border-color: ${catBorder};">

      ${hasNext ? `
      <button onclick="showDetail('${nextId}')" class="hidden md:flex absolute right-2 lg:-right-2 z-10 w-10 h-10 lg:w-12 lg:h-12 items-center justify-center rounded-full border-2 bg-white shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer" style="border-color: ${catBorder}; color: ${catColor};" onmouseover="this.style.backgroundColor='${catBg}'" onmouseout="this.style.backgroundColor='white'" title="Cadeau suivant">
<span class="text-sm lg:text-base ml-[2px]">▶</span>      </button>` : ''}
    </div>
    
    <div class="text-left">
<div class="flex items-center gap-3 md:gap-4 mb-3">
          <div class="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm text-lg lg:text-xl transition-transform hover:scale-110" style="background-color: ${catBg}; border-color: ${catBorder};">
            ${catEmoji}
          </div>
          <h2 class="text-2xl lg:text-3xl font-black text-[#5C544D] leading-tight">${item.nom || "Cadeau"}</h2>
        </div>
        
        ${texteCommentaireHTML ? `<div class="text-xs lg:text-sm font-medium text-stone-500 leading-relaxed mb-6 whitespace-pre-wrap bg-stone-50 p-4 rounded-2xl border border-stone-100">${texteCommentaireHTML}</div>` : ''}
        
        <div class="flex flex-wrap items-center gap-3 mb-6">
          <div class="bg-white border px-3 py-2 rounded-xl flex items-center gap-1 text-xs shadow-sm" style="border-color: ${catBorder}">
            <span class="font-black" style="color: ${catColor}">Prix :</span>
            <span class="font-black" style="color: ${catColor}">${item.prix || "0"} €</span>
          </div>
          <span class="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-2xs ${isReserved ? 'bg-[#F5EBE8] text-[#5C544D] border border-[#E6D5CF]' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}">
            ${isReserved ? `🔒 Réservé par ${getReserverDisplay(res)}` : '✨ Disponible'}
          </span>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          ${item.lien ? `<a href="${item.lien}" target="_blank" class="flex-1 py-4 bg-white border border-[#D4E6F1] hover:bg-[#EAF4FC] text-[#2980B9] rounded-2xl font-black text-xs uppercase tracking-widest text-center transition shadow-sm">🔗 Voir sur le site</a>` : ''}
          ${actionButtonHtml}
        </div>
        ${adminButtonsHtml}
    </div>
  `;
}

function closeDetails() {
  const panel = document.getElementById('details-panel');
  const contentEl = document.getElementById('details-content');
  
  if (!panel || panel.style.display === 'none') return;

  // 1. L'illusion d'optique : glissement rapide vers la droite + fondu en sortie
  contentEl.style.transition = 'transform 250ms ease-in, opacity 200ms ease-in';
  contentEl.style.transform = 'translateX(100%)';
  contentEl.style.opacity = '0';

  // 2. On attend la fin des 250ms pour cacher le panneau et RÉINITIALISER la physique
  setTimeout(() => {
    panel.style.display = 'none';
    document.body.classList.remove('overflow-hidden');
    
    // ⚠️ Remise à zéro vitale : sinon au prochain cadeau cliqué, la fenêtre s'ouvrira hors-écran !
    contentEl.style.transform = '';
    contentEl.style.opacity = '';
    contentEl.style.transition = '';
  }, 240);
}

function openReservationModal(id) {
  selectedItemId = id; document.getElementById('custom-pseudo-input').value = ""; setReservationMode('public'); 
  const modal = document.getElementById('reservation-modal');
  modal.classList.remove('opacity-0', 'pointer-events-none'); modal.querySelector('div').classList.remove('translate-y-10');
  document.body.classList.add('overflow-hidden'); // 🔒 Bloque le scroll
}

function closeReservationModal() {
  const modal = document.getElementById('reservation-modal');
  modal.classList.add('opacity-0', 'pointer-events-none'); modal.querySelector('div').classList.add('translate-y-10');
  
  // 🔓 Rend le scroll UNIQUEMENT si la grande fenêtre de détails n'est pas ouverte en dessous
  if (document.getElementById('details-panel').style.display !== 'flex') {
    document.body.classList.remove('overflow-hidden');
  }
}

function setReservationMode(mode) {
  chosenResMode = mode;
  ['public', 'pseudonyme', 'anonyme'].forEach(m => { document.getElementById(`res-btn-${m}`).className = "w-full text-left p-4 rounded-2xl border border-stone-200 bg-[#F5FAFF] hover:bg-[#EAF4FC] transition font-bold text-sm flex items-center gap-3"; });
  document.getElementById(`res-btn-${mode}`).className = "w-full text-left p-4 rounded-2xl border-2 border-[#7FB3D5] bg-[#EAF4FC] text-[#1F618D] transition font-black text-sm flex items-center gap-3 shadow-sm";
  const container = document.getElementById('custom-pseudo-container');
  if (mode === 'pseudonyme') { container.classList.remove('hidden'); document.getElementById('custom-pseudo-input').focus(); } else { container.classList.add('hidden'); }
}

async function submitReservation() {
  const pseudo = document.getElementById('custom-pseudo-input').value.trim();
  if (chosenResMode === 'pseudonyme' && !pseudo) { alert("Veuillez saisir votre pseudonyme !"); return; }
  closeReservationModal();
  const { error } = await sb.from('reservations').insert([{ item_id: selectedItemId, user_id: currentUser.id, mode_prive: chosenResMode, pseudo_name: chosenResMode === 'pseudonyme' ? pseudo : null }]);
  if (error) { alert("Erreur : " + error.message); } else { alert("Cadeau bloqué ! 🎉"); await loadItems(); showDetail(selectedItemId); }
}

async function cancelReservation(itemId) {
  const item = itemsData.find(i => i.id === itemId);
  if (!item || !item.reservations || item.reservations.length === 0) return;
  const res = item.reservations[0];
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', currentUser.id).single();
  const isAdmin = profile?.is_admin || false;

  if (res.user_id !== currentUser.id && !isAdmin) { alert("Vous ne pouvez pas annuler la réservation d'un autre proche ! 😉"); return; }
  if (!confirm("Voulez-vous vraiment libérer ce cadeau pour les autres proches ? 🎁")) return;

  const { error } = await sb.from('reservations').delete().eq('id', res.id);
  if (error) alert("Erreur : " + error.message);
  else { alert("Cadeau libéré ! ✨"); await loadItems(); showDetail(itemId); }
}

async function toggleAdminView() {
  const panel = document.getElementById('details-panel');
  const contentEl = document.getElementById('details-content');
  panel.style.display = 'flex';
  document.body.classList.add('overflow-hidden'); // 🔒 Bloque le scroll

  const catOptions = Object.keys(catConfig).filter(k => k !== 'all').map(k => `<option value="${catConfig[k].id}">${catConfig[k].emoji} ${catConfig[k].label}</option>`).join('');

  contentEl.innerHTML = `
    <button onclick="closeDetails()" class="mb-4 bg-stone-100 border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-2 hover:bg-stone-200 transition cursor-pointer w-max">← Retour</button>
    <h2 class="text-xl font-black text-[#5C544D] mb-4 text-left">🛠️ Espace Administration</h2>
    
    <div class="bg-[#F5FAFF] border border-[#D4E6F1] p-5 rounded-2xl text-left shadow-2xs mb-6">
      <h3 class="font-bold text-xs text-[#2980B9] mb-3 uppercase tracking-wider">Publier un nouvel objet :</h3>
      <input type="text" id="add-nom" placeholder="Nom du cadeau *" class="w-full mb-2.5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white font-bold">
      <input type="number" id="add-prix" placeholder="Prix (€) *" class="w-full mb-2.5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white font-bold">
      <input type="text" id="add-lien" placeholder="Lien marchand (Optionnel)" class="w-full mb-3 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white">
      
      <div class="mb-3 space-y-2">
        <label class="text-[11px] font-bold text-stone-400 block">Image du produit (Optionnel) :</label>
        <label class="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-[#7FB3D5] hover:border-[#2980B9] rounded-xl cursor-pointer text-xs font-bold text-[#2980B9] transition shadow-2xs">
          <span>📁</span> Parcourir mes photos
          <input type="file" accept="image/*" class="hidden" onchange="uploadAdminImage(event)">
        </label>
        <div id="upload-status" class="text-[11px] font-bold text-stone-400 italic hidden px-1"></div>
        <input type="text" id="add-photo" placeholder="Ou coller une URL d'image..." class="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white">
      </div>

      <select id="add-cat" class="w-full mb-3 p-3 rounded-xl border border-stone-200 text-xs bg-white font-bold">${catOptions}</select>
      <textarea id="add-desc" placeholder="Un petit mot sur ce cadeau (Optionnel)..." class="w-full mb-4 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white min-h-[70px] resize-y"></textarea>

      <button onclick="addNewItem()" class="w-full py-4 bg-[#7FB3D5] hover:bg-[#6CA1C3] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition active:scale-95 cursor-pointer">Publier l'objet</button>
    </div>

    <button onclick="renderAdminReservationsView()" class="w-full py-3.5 bg-white border-2 border-[#7FB3D5] hover:bg-[#EAF4FC] text-[#1F618D] rounded-xl font-black text-xs uppercase tracking-widest shadow-2xs transition active:scale-95 cursor-pointer">
      📋 Voir le suivi des réservations
    </button>
  `;

  const draft = JSON.parse(localStorage.getItem('admin_draft') || '{}');
  if (draft.nom) document.getElementById('add-nom').value = draft.nom;
  if (draft.prix) document.getElementById('add-prix').value = draft.prix;
  if (draft.lien) document.getElementById('add-lien').value = draft.lien;
  if (draft.desc) document.getElementById('add-desc').value = draft.desc;

  const saveDraft = () => {
    localStorage.setItem('admin_draft', JSON.stringify({
      nom: document.getElementById('add-nom').value,
      prix: document.getElementById('add-prix').value,
      lien: document.getElementById('add-lien').value,
      desc: document.getElementById('add-desc').value
    }));
  };

  ['add-nom', 'add-prix', 'add-lien', 'add-desc'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', saveDraft);
  });
}

async function uploadAdminImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const statusDiv = document.getElementById('upload-status');
  const urlInput = document.getElementById('add-photo');
  statusDiv.classList.remove('hidden'); statusDiv.style.color = '#2980B9'; statusDiv.innerText = "⏳ Transfert...";

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const fileName = `${Date.now()}_${cleanName}`;
    const { error } = await sb.storage.from(STORAGE_BUCKET).upload(fileName, file);
    if (error) throw error;
    const { data: pubData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    if (pubData?.publicUrl) {
      urlInput.value = pubData.publicUrl;
      statusDiv.style.color = '#27AE60'; statusDiv.innerText = "✅ Image rattachée !";
    }
  } catch (err) {
    statusDiv.style.color = '#E74C3C'; statusDiv.innerText = `❌ Erreur : ${err.message}`;
  }
}

async function addNewItem() {
  const nom = document.getElementById('add-nom').value.trim(); 
  const prix = document.getElementById('add-prix').value; 
  const lien = document.getElementById('add-lien').value.trim(); 
  const photo = document.getElementById('add-photo').value.trim(); 
  const cat_id = document.getElementById('add-cat').value;
  const desc = document.getElementById('add-desc').value.trim();

  if (!nom || !prix) { alert("Le Nom et le Prix sont obligatoires !"); return; }
  
  const { error } = await sb.from('items').insert([{ 
    nom: nom, prix: parseFloat(prix), lien: lien || null, photo_url: photo || null, cat_id: cat_id, description: desc || null
  }]);
  
  if (!error) { 
    alert("Objet publié !"); localStorage.removeItem('admin_draft'); await loadItems(); closeDetails(); 
  } else { alert("Erreur d'ajout : " + error.message); }
}

function renderAdminReservationsView() {
  const contentEl = document.getElementById('details-content');
  const reservedItems = itemsData.filter(item => item.reservations && item.reservations.length > 0);
  let listHtml = "";

  if (reservedItems.length === 0) {
    listHtml = `<p class="text-center text-xs font-bold text-stone-400 py-8 uppercase tracking-wider">Aucune réservation pour le moment 🎁</p>`;
  } else {
    listHtml = `
      <div class="hidden lg:block overflow-x-auto rounded-xl border border-stone-100 shadow-2xs">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-stone-50 border-b border-stone-100 text-stone-500 font-black uppercase tracking-wider"><th class="p-3">Cadeau</th><th class="p-3">Catégorie</th><th class="p-3">Prix</th><th class="p-3">Réservé par</th><th class="p-3 text-center">Annuler</th></tr>
          </thead>
          <tbody class="divide-y divide-stone-50 font-medium text-stone-700">
            ${reservedItems.map(item => {
              const res = item.reservations[0];
              const conf = catConfig[item.cat_id] || { emoji: '📦', label: 'Inclassable', text: '#5D6D7E' };
              return `
                <tr class="hover:bg-stone-50/50 transition-colors">
                  <td class="p-3 font-bold text-stone-800 truncate max-w-[180px]">${item.nom}</td>
                  <td class="p-3"><span class="px-2 py-1 rounded-lg text-[10px] font-bold" style="background:${conf.bg || '#F2F3F4'}; color:${conf.text}">${conf.emoji} ${conf.label}</span></td>
                  <td class="p-3 font-bold">${item.prix} €</td>
                  <td class="p-3"><span class="font-bold">${getReserverDisplay(res)}</span></td>
                  <td class="p-3 text-center"><button onclick="cancelReservation('${item.id}'); setTimeout(renderAdminReservationsView, 500);" class="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center border border-red-200 text-sm transition mx-auto cursor-pointer">🚫</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="lg:hidden flex flex-col gap-3">
        ${reservedItems.map(item => {
          const res = item.reservations[0];
          const conf = catConfig[item.cat_id] || { emoji: '📦', label: 'Inclassable', text: '#5D6D7E' };
          return `
            <div class="p-4 rounded-xl border border-stone-100 bg-stone-50/50 flex flex-col gap-2 text-left text-xs relative">
              <div class="flex justify-between items-start gap-2"><span class="font-black text-stone-800 text-sm leading-tight max-w-[70%]">${item.nom}</span><span class="font-black text-stone-600 bg-white border border-stone-100 px-2 py-1 rounded-lg text-[10px] shrink-0">${item.prix} €</span></div>
              <div class="flex items-center justify-between w-full mt-1 gap-2">
                <div class="flex flex-wrap items-center gap-1.5 min-w-0"><span class="px-2 py-1 rounded-lg text-[10px] font-bold" style="background:${conf.bg || '#F2F3F4'}; color:${conf.text}">${conf.emoji} ${conf.label}</span><span class="text-stone-300 shrink-0">•</span><span class="text-stone-500 font-bold truncate">Par ${getReserverDisplay(res)}</span></div>
                <button onclick="cancelReservation('${item.id}'); setTimeout(renderAdminReservationsView, 500);" class="w-9 h-9 rounded-full bg-[#F9EBEA] text-[#A93226] border border-[#F5CBA7] flex items-center justify-center shrink-0 shadow-sm text-xs transition cursor-pointer">🚫</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  contentEl.innerHTML = `
    <button onclick="toggleAdminView()" class="mb-4 bg-stone-100 border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-2 hover:bg-stone-200 transition cursor-pointer w-max">← Retour</button>
    <h2 class="text-xl font-black text-[#5C544D] mb-4 text-left">📋 Suivi des Réservations</h2>
    <div class="mt-2">${listHtml}</div>
  `;
}

async function deleteItem(id) {
  if (!confirm("⚠️ Supprimer définitivement cet objet de la liste ?\n\n(Les réservations associées seront aussi effacées)")) return;
  await sb.from('reservations').delete().eq('item_id', id);
  const { error } = await sb.from('items').delete().eq('id', id);
  if (error) alert("Erreur : " + error.message);
  else { alert("Cadeau supprimé ! 🗑️"); await loadItems(); closeDetails(); }
}

function showEditForm(itemId) {
  const item = itemsData.find(i => i.id === itemId);
  if(!item) return;
  const contentEl = document.getElementById('details-content');
  const catOptions = Object.keys(catConfig).filter(k => k !== 'all').map(k => `<option value="${catConfig[k].id}" ${item.cat_id === catConfig[k].id ? 'selected' : ''}>${catConfig[k].emoji} ${catConfig[k].label}</option>`).join('');

  const safeNom = (item.nom || "").replace(/"/g, '&quot;');
  const safeLien = (item.lien || "").replace(/"/g, '&quot;');
  const safePhoto = (item.photo_url || "").replace(/"/g, '&quot;');

  contentEl.innerHTML = `
    <button onclick="showDetail('${item.id}')" class="mb-4 bg-stone-100 border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-2 hover:bg-stone-200 transition cursor-pointer w-max">← Annuler</button>
    <h2 class="text-xl font-black text-[#B7950B] mb-4 text-left">⚙️ Modifier l'objet</h2>

    <div class="bg-[#FEF9E7] border border-[#F9E79F] p-5 rounded-2xl text-left shadow-2xs">
      <input type="text" id="edit-nom" value="${safeNom}" placeholder="Nom du cadeau *" class="w-full mb-2.5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white font-bold text-stone-700">
      <input type="number" id="edit-prix" value="${item.prix || ''}" placeholder="Prix (€) *" class="w-full mb-2.5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white text-stone-700">
      <input type="text" id="edit-lien" value="${safeLien}" placeholder="Lien marchand (Optionnel)" class="w-full mb-3 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white text-stone-700">

      <div class="mb-3 space-y-2">
        <label class="text-xs font-bold text-stone-500 block">Image du produit :</label>
        <label class="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-[#F1C40F] hover:border-[#F39C12] rounded-xl cursor-pointer text-xs font-bold text-[#F39C12] transition shadow-2xs">
          <span>📁</span> Changer l'image
          <input type="file" accept="image/*" class="hidden" onchange="uploadEditImage(event)">
        </label>
        <div id="edit-upload-status" class="text-[11px] font-bold text-stone-400 italic hidden px-1"></div>
        <input type="text" id="edit-photo" value="${safePhoto}" placeholder="Ou URL d'image..." class="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white text-stone-700">
      </div>

      <select id="edit-cat" class="w-full mb-4 p-3 rounded-xl border border-stone-200 text-xs bg-white font-bold text-stone-700">${catOptions}</select>
      <textarea id="edit-desc" placeholder="Un petit mot descriptif (Optionnel)..." class="w-full mb-5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white min-h-[80px] resize-y text-stone-700">${item.description || ""}</textarea>

      <button onclick="saveItemChanges('${item.id}')" class="w-full py-4 bg-[#F1C40F] hover:bg-[#F39C12] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition active:scale-95 cursor-pointer">Enregistrer</button>
    </div>
  `;
}

async function uploadEditImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const statusDiv = document.getElementById('edit-upload-status');
  const urlInput = document.getElementById('edit-photo');
  statusDiv.classList.remove('hidden'); statusDiv.style.color = '#F39C12'; statusDiv.innerText = "⏳ Transfert...";

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const fileName = `${Date.now()}_${cleanName}`;
    const { error } = await sb.storage.from(STORAGE_BUCKET).upload(fileName, file);
    if (error) throw error;
    const { data: pubData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    if (pubData?.publicUrl) {
      urlInput.value = pubData.publicUrl;
      statusDiv.style.color = '#27AE60'; statusDiv.innerText = "✅ Nouvelle image rattachée !";
    }
  } catch (err) { statusDiv.style.color = '#E74C3C'; statusDiv.innerText = `❌ Erreur : ${err.message}`; }
}

async function saveItemChanges(id) {
  const nom = document.getElementById('edit-nom').value.trim();
  const prix = document.getElementById('edit-prix').value;
  const lien = document.getElementById('edit-lien').value.trim();
  const photo = document.getElementById('edit-photo').value.trim();
  const cat_id = document.getElementById('edit-cat').value;
  const desc = document.getElementById('edit-desc').value.trim();

  if (!nom || !prix) { alert("Le Nom et le Prix sont obligatoires !"); return; }
  
  const { error } = await sb.from('items').update({
    nom: nom, prix: parseFloat(prix), lien: lien || null, photo_url: photo || null, cat_id: cat_id, description: desc || null
  }).eq('id', id);

  if (error) alert("Erreur : " + error.message);
  else { alert("Mis à jour ! ✨"); await loadItems(); showDetail(id); }
}

// --- ACTUALISATION SILENCIEUSE EN ARRIÈRE-PLAN ---
async function backgroundRefresh() {
  if (document.hidden || !currentUser) return; 

  const panelEl = document.getElementById('details-panel');
  const panelOpen = panelEl && panelEl.style.display !== 'none';
  const modalEl = document.getElementById('reservation-modal');
  const modalOpen = modalEl && !modalEl.classList.contains('opacity-0');
  
  if (panelOpen || modalOpen) return;

  const { data: newItems } = await sb.from('items').select('*').order('nom', { ascending: true });
  const { data: newReservations } = await sb.from('reservations').select('*');
  const { data: profiles } = await sb.from('profiles').select('*');

  if (!newItems) return;

  const newItemsData = newItems.map(item => {
    const itemRes = newReservations ? newReservations.filter(r => r.item_id === item.id) : [];
    if (itemRes.length > 0) {
      itemRes[0].profiles = profiles ? profiles.find(p => p.id === itemRes[0].user_id) : null;
    }
    item.reservations = itemRes;
    return item;
  });

  if (JSON.stringify(newItemsData) !== JSON.stringify(itemsData)) {
    itemsData = newItemsData;
    const currentScroll = window.scrollY;
    renderItemsLayout();
    window.scrollTo({ top: currentScroll }); 
  }
}
setInterval(backgroundRefresh, 15000);

// =========================================================================
//   RACCOURCIS CLAVIER : ÉCHAP (Fermer) + FLÈCHES (Naviguer)
// =========================================================================
document.addEventListener('keydown', (event) => {
  const resModal = document.getElementById('reservation-modal');
  const detailsPanel = document.getElementById('details-panel');
  
  const isResModalOpen = resModal && !resModal.classList.contains('opacity-0');
  const isDetailsOpen = detailsPanel && detailsPanel.style.display === 'flex';

  // 1. Touche Échap (Fermeture)
  if (event.key === 'Escape') {
    if (isResModalOpen) { closeReservationModal(); return; }
    if (isDetailsOpen) { closeDetails(); }
  }

  // 2. Touches Flèches Gauche/Droite (Navigation Diaporama)
  if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && isDetailsOpen && !isResModalOpen) {
    const visibleItems = getVisibleItems();
    const currentIndex = visibleItems.findIndex(i => i.id === selectedItemId);
    
    if (event.key === 'ArrowLeft' && currentIndex > 0) {
      showDetail(visibleItems[currentIndex - 1].id);
    } else if (event.key === 'ArrowRight' && currentIndex >= 0 && currentIndex < visibleItems.length - 1) {
      showDetail(visibleItems[currentIndex + 1].id);
    }
  }
});

// =========================================================================
//   GESTURE MOBILE : SWIPE BORD GAUCHE (Retour / Annuler)
// =========================================================================
let tStartX = 0, tStartY = 0;

document.addEventListener('touchstart', (e) => {
  tStartX = e.changedTouches[0].screenX;
  tStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const resModal = document.getElementById('reservation-modal');
  const detailsPanel = document.getElementById('details-panel');
  
  const isResOpen = resModal && !resModal.classList.contains('opacity-0');
  const isDetailsOpen = detailsPanel && detailsPanel.style.display === 'flex';

  if (!isResOpen && !isDetailsOpen) return;

  const deltaX = e.changedTouches[0].screenX - tStartX;
  const deltaY = Math.abs(e.changedTouches[0].screenY - tStartY);

  // Départ < 85px du bord gauche + glissé vers la droite > 65px + pas de scroll vertical brusque
  if (tStartX < 85 && deltaX > 65 && deltaY < 55) {
    if (isResOpen) {
      closeReservationModal();
    } else if (isDetailsOpen) {
      const premierBouton = document.querySelector('#details-content button');
      if (premierBouton) premierBouton.click(); // Rétro-pédalage automatique exact !
    }
  }
}, { passive: true });

// =========================================================================
//   OUTILS D'ADMINISTRATION : MOD DEV
// =========================================================================

const DEV_MODE = false; 
const DEV_AS_MASTER = false;  

if (DEV_MODE) {
  document.getElementById('step-global').style.display = 'none';
  
  async function autoLoginDev() {
    // Ton profil Admin
    const prenomAdmin = "Olivier"; 
    const cleanPrenom = prenomAdmin.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    
    const emailAdmin = `${cleanPrenom}@liste.bebe`;
    const emailInvite = "test@liste.bebe"; 

    // Bascule dynamique selon DEV_AS_MASTER
    const emailFinal = DEV_AS_MASTER ? emailAdmin : emailInvite;
    const passwordFinal = DEV_AS_MASTER ? "GO146489" : "123456";

    // Tentative de connexion silencieuse
    const { data, error } = await sb.auth.signInWithPassword({ email: emailFinal, password: passwordFinal });
    
    if (!error && data.user) { 
      currentUser = data.user; 
      document.getElementById('step-auth').style.display = 'none'; 
      initApp(); 
    } else { 
      document.getElementById('step-auth').style.display = 'flex'; 
    }
  }
  
  autoLoginDev();
}
