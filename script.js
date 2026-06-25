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

  // 1. Le mot de passe familial "Crevette" est-il connu ?
  if (localStorage.getItem('family_unlocked') === 'true') {
    if (stepGlobal) stepGlobal.style.display = 'none';
    
    // 2. On interroge Supabase de force avant d'afficher quoi que ce soit
    const { data: { session } } = await sb.auth.getSession();
    
    if (session) {
      // ✅ La session est trouvée (Connexion réussie en arrière-plan)
      currentUser = session.user;
      if (stepAuth) stepAuth.style.display = 'none';
      
      // 🪄 LA MAGIE EST LÀ : On lance toute ta séquence de démarrage
      initApp(); 
    } else {
      // ❌ Aucune session trouvée (ou expirée), on demande les identifiants
      if (stepAuth) stepAuth.style.display = 'flex';
    }
  } else {
    // Le mot de passe "Crevette" n'a pas encore été tapé
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
    
    // 💾 ON SAUVEGARDE L'ACCÈS DANS LA MÉMOIRE LONGUE ICI :
    localStorage.setItem('family_unlocked', 'true');
    
    document.getElementById('step-global').style.display = 'none';
    document.getElementById('step-auth').style.display = 'flex';
  } else { 
    alert("Code incorrect"); 
  }
}

// --- NOUVELLE FONCTION : S'ENREGISTRER POUR LA PREMIÈRE FOIS ---
async function handleRegister() {
  const prenomRaw = document.getElementById('reg-prenom').value.trim();
  const password = document.getElementById('reg-pass').value;
  const surnom = document.getElementById('reg-surnom').value.trim();

  if (!prenomRaw || !password) { 
    alert("Veuillez remplir votre prénom et choisir un mot de passe !"); 
    return; 
  }

  // Ruse de l'email technique invisible
  const cleanPrenom = prenomRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
  const emailTechnique = `${cleanPrenom}@liste.bebe`;

  // Création du compte dans Supabase
  const { data, error } = await sb.auth.signUp({ email: emailTechnique, password: password });
  
  if (error) { 
    if (error.message.includes("already exists") || error.status === 422) {
      alert("Ce prénom est déjà enregistré ! Si c'est vous, utilisez la section 'Se connecter' en dessous. 😉");
    } else {
      alert("Erreur d'inscription : " + error.message); 
    }
    return; 
  }
  
  // Création du profil avec le vrai prénom et surnom
  if (data && data.user) {
    currentUser = data.user;
    await sb.from('profiles').upsert([{ 
      id: currentUser.id, 
      prenom: prenomRaw, 
      surnom: surnom || null, 
      is_admin: false 
    }]);
    alert(`Bienvenue ${prenomRaw} ! Votre compte est créé. 🎉`);
    document.getElementById('step-auth').style.display = 'none';
    initApp();
  }
}

// --- NOUVELLE FONCTION : SE CONNECTER LES FOIS D'APRÈS ---
async function handleLogin() {
  const prenomRaw = document.getElementById('login-prenom').value.trim();
  const password = document.getElementById('login-pass').value;

  if (!prenomRaw || !password) { 
    alert("Veuillez remplir votre prénom et votre mot de passe !"); 
    return; 
  }

  const cleanPrenom = prenomRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
  const emailTechnique = `${cleanPrenom}@liste.bebe`;

  // Tentative de connexion directe
  const { data, error } = await sb.auth.signInWithPassword({ email: emailTechnique, password: password });
  
  if (error) {
    alert("Prénom ou mot de passe incorrect. (Vérifiez que vous vous êtes bien enregistré la première fois !)");
    return;
  }
  
  if (data && data.user) {
    currentUser = data.user;
    document.getElementById('step-auth').style.display = 'none';
    initApp();
  }
}

// --- FONCTION DE DÉCONNEXION ---
async function handleLogout() {
  const confirmation = confirm("Souhaitez-vous vous déconnecter de la liste ?");
  if (!confirmation) return;

  const { error } = await sb.auth.signOut();
  
  if (error) {
    alert("Erreur lors de l'envoi de la déconnexion : " + error.message);
  } else {
    // Réinitialisation des variables locales
    currentUser = null;
    itemsData = [];
    activeCategory = "all";
    filterAvailableOnly = {};

    // On masque l'application et on réaffiche l'écran d'identification prénom/mot de passe
    document.getElementById('app').style.display = 'none';
    document.getElementById('step-auth').style.display = 'flex';
    
    // Vider les formulaires de connexion pour plus de sécurité
    document.getElementById('login-prenom').value = "";
    document.getElementById('login-pass').value = "";
    
    alert("Vous êtes déconnecté ! À bientôt. 👋");
  }
}

async function initApp() {
  document.getElementById('app').style.display = 'flex';
  rotateCarousel();

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', currentUser.id).single();
  if (profile?.is_admin) { document.getElementById('master-btn').classList.remove('hidden'); }

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
  
  initScrollListener();
}

// =========================================================================
//   LE SMART HEADER : Correction vitesse et point de déclenchement
// =========================================================================
// =========================================================================
//   LE SMART HEADER : Avec anti-rebond et tolérance
// =========================================================================
function initScrollListener() {
  const sidebar = document.getElementById('left-sidebar');
  const catWrapper = document.getElementById('sticky-cat-wrapper');
  const notchProtector = document.getElementById('notch-protector'); 
  let lastScrollTop = 0;
  
  if (!sidebar || !catWrapper) return;

  catWrapper.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

  sidebar.addEventListener('scroll', function() {
    let scrollTop = sidebar.scrollTop;
    
    // 🪄 1. LE BOUCLIER D'ENCOCHE (Synchronisation parfaite)
    if (notchProtector) {
      // On lit la distance exacte entre la barre de catégories et le haut de l'écran
      const rect = catWrapper.getBoundingClientRect();
      // L'encoche iPhone faisant environ 47px, dès qu'on arrive à 60px, on allume le bouclier
      if (rect.top <= 60) {
        notchProtector.style.opacity = '1';
      } else {
        notchProtector.style.opacity = '0';
      }
    }
    
    // 🛡️ SÉCURITÉ : Ignorer le rebond physique (effet élastique iOS)
    if (scrollTop + sidebar.clientHeight >= sidebar.scrollHeight - 10) {
      return; 
    }
    
    // 🪄 2. LE MASQUAGE DE LA BARRE
    if (scrollTop > 580) {
      if (scrollTop > lastScrollTop) {
        // On la pousse très haut (-200%) pour qu'elle passe sous le bouclier et disparaisse totalement
        catWrapper.style.transform = 'translateY(-200%)';
      } else {
        catWrapper.style.transform = 'translateY(0)';
      }
    } else {
      catWrapper.style.transform = 'translateY(0)';
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
  }, { passive: true });
}

function renderCategoryBar() {
  const bar = document.getElementById('category-bar');
  bar.innerHTML = '';

  Object.values(catConfig).forEach(c => {
    const isActive = (activeCategory === c.id);
    const btn = document.createElement('button');
    btn.className = "flex flex-col items-center justify-center outline-none group cursor-pointer transition select-none";
    
    btn.onclick = () => { 
      activeCategory = c.id; 
      
      if (c.id !== 'all') {
        collapsedGroups = {}; 
      }
      
      renderCategoryBar(); 
      renderItemsLayout(); 
      const sidebar = document.getElementById('left-sidebar');
      if (sidebar && window.innerWidth < 1024) {
         sidebar.scrollTo({ top: 220, behavior: 'smooth' });
      }
    };
    
    const circleStyle = isActive ? `background: ${c.bg}; border-color: ${c.border}; color: ${c.text}; transform: scale(1.08); box-shadow: 0 4px 6px rgba(0,0,0,0.06);` : `background: #FFFFFF; border-color: #E2E8F0; color: #78716C;`;
    const textStyle = isActive ? `color: ${c.text}; font-weight: 800;` : `color: #A8A29E; font-weight: 700;`;

    let shortLabel = c.label;
    if (shortLabel.toLowerCase().includes("maternité")) shortLabel = "À la mat";
    else shortLabel = shortLabel.replace(/^(À la |A la |La |Le |L'|Les )/i, "").substring(0, 11);

    btn.innerHTML = `
      <div class="w-12 h-12 flex items-center justify-center rounded-full text-xl border-2 transition-all duration-300 group-hover:scale(105) shadow-2xs" style="${circleStyle}">${c.emoji}</div>
      <span class="text-[9px] uppercase tracking-wider mt-1.5 transition-colors text-center leading-tight truncate w-full" style="${textStyle}">${shortLabel}</span>
    `;
    bar.appendChild(btn);
  });
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

function renderItemsLayout() {
  const container = document.getElementById('list-container');
  if (!container) return;

  container.innerHTML = '';
  const isAll = activeCategory === 'all';
  const catsToRender = isAll ? Object.keys(catConfig).filter(k => k !== 'all') : [activeCategory];
  
  // 📝 TEXTE INTRODUCTIF MOBILE (Injecté uniquement s'il y a du contenu à afficher et masqué sur desktop via lg:hidden)
  const mobileIntroHtml = `
    <div class="lg:hidden w-full bg-white p-5 rounded-[1.5rem] border border-[#D4E6F1] shadow-2xs text-left mb-5 select-text">
      <h3 class="font-black text-center text-stone-800 text-xs uppercase tracking-wider mb-1.5">Chère famille et chers amis, ✨</h3>
      <p class="text-[11px] text-center text-stone-500 leading-relaxed mb-3 font-medium">
 Vous l'attendier avec impatience ? (ou pas 😅) Voici la liste de naissance pour notre crevette d'amour 🐣 ! Aucune obligation, seulement des idées pour vous éviter les doublons (et limiter la fièvre acheteuse 🤪) <br> 
         Un grand merci d'avance pour toutes vos délicates attentions et votre accompagnement dans cette belle aventure. On vous embrasse et on a hâte de vous retrouver... à 3 du coups bientôt 🥰
 </p>
      <div class="pt-2.5 border-t border-stone-100 text-[11px]">
        <span class="font-black text-[#2980B9]">📍 Besoin de notre adresse pour une livraison ?</span>
        <p class="text-stone-600 font-bold mt-1 leading-normal">
         Gaëlle RAUD & Olivier CADIOU<br>
          30 Quai de la Bataille<br>
          54000 Nancy
        </p>
      </div>
    </div>
  `;

  // On commence notre structure HTML avec l'intro mobile
  let structureHtml = mobileIntroHtml;

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
      <div class="w-full rounded-[1.5rem] p-4 border-2 shadow-xs mb-6 transition-all duration-300" style="background: ${conf.bg}; border-color: ${conf.border};">
        <div class="flex items-center justify-between py-1 px-1">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${conf.emoji}</span>
            <h3 class="font-black text-sm uppercase tracking-wider" style="color: ${conf.text}">${conf.label}</h3>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="toggleAvailableFilter('${catId}')" class="px-3 py-1.5 border text-[10px] font-black uppercase tracking-wider rounded-xl shadow-2xs cursor-pointer transition-all hover:scale-105 active:scale-95" style="${badgeStyle}" title="Filtrer les cadeaux disponibles">
              🎁 dispo ${availableCount} / ${totalCount}
            </button>
          </div>
        </div>
        
        <div class="flex flex-col gap-4 mt-5">
          ${itemsToRender.length > 0 
            ? itemsToRender.map(item => renderItemCard(item)).join('') 
            : `<p class="text-center text-[11px] font-bold uppercase tracking-wider py-6" style="color: ${conf.text}; opacity: 0.6;">Tout a été réservé ici ! 🥳</p>`}
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

      const badgeStyle = isFiltered 
        ? `background: #5D6D7E; color: white; border-color: #5D6D7E;` 
        : `background: white; color: #5D6D7E; border-color: #E5E7E9;`;

      structureHtml += `
        <div class="w-full rounded-[1.5rem] p-4 border-2 shadow-xs mb-6" style="background: #F2F3F4; border-color: #E5E7E9;">
          <div class="flex items-center justify-between py-1 px-1">
            <div class="flex items-center gap-2"><span class="text-2xl">📦</span><h3 class="font-black text-sm uppercase tracking-wider text-[#5D6D7E]">Inclassables</h3></div>
            <div class="flex items-center gap-1.5">
              <button onclick="toggleAvailableFilter('orphans')" class="px-3 py-1.5 border text-[10px] font-black uppercase tracking-wider rounded-xl shadow-2xs cursor-pointer transition-all hover:scale-105 active:scale-95" style="${badgeStyle}">
                🎁 dispo ${availableCount} / ${totalOrphans}
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-4 mt-5">
            ${itemsToRender.length > 0 
              ? itemsToRender.map(item => renderItemCard(item)).join('') 
              : `<p class="text-center text-[11px] font-bold uppercase tracking-wider py-6 text-[#5D6D7E] opacity-60">Tout a été réservé ici ! 🥳</p>`}
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = structureHtml || `<p class="text-center text-stone-400 mt-10 font-bold text-sm">Rubrique vide ✨</p>`;
}

function renderItemCard(item) {
  const isReserved = item.reservations && item.reservations.length > 0;
  const res = isReserved ? item.reservations[0] : null;
  const imgUrl = item.photo_url || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&q=80"; 
  const title = item.nom || "Cadeau";
  const price = item.prix || "0";
  const itemUrl = item.lien || "#";

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
    <div onclick="showDetail('${item.id}')" class="w-full bg-white/95 backdrop-blur-sm rounded-2xl p-4 border border-white shadow-sm flex flex-col transition hover:scale-[1.01] hover:shadow-md cursor-pointer">
      <div class="flex justify-between items-center w-full gap-2 mb-2.5">
        <h4 class="font-black text-stone-800 text-sm truncate flex-1 text-left" title="${title}">${title}</h4>
        ${statusBadge}
      </div>
      <div class="w-full aspect-[9/10] bg-[#F8FAFC] rounded-xl border border-stone-100 mb-3 overflow-hidden flex items-center justify-center shadow-inner">
        <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&q=80';" class="w-full h-full object-contain">
      </div>
      <div class="flex items-center w-full gap-2" onclick="event.stopPropagation();">
        <div class="bg-white border px-3 py-2 rounded-xl flex items-center gap-1 text-xs shrink-0 mr-auto shadow-sm" style="border-color: ${catBorder}">
          <span class="font-black" style="color: ${catColor}">Prix :</span>
          <span class="font-black" style="color: ${catColor}">${price} €</span>
        </div>
        <a href="${itemUrl}" target="_blank" class="w-10 h-10 rounded-full bg-white hover:bg-[#EAF4FC] text-[#2980B9] flex items-center justify-center border border-[#D4E6F1] transition hover:scale-105 shrink-0 text-sm shadow-sm" title="Site internet">🔗</a>
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

async function showDetail(id) {
  selectedItemId = id; 
  const item = itemsData.find(i => i.id === id);
  if(!item) return;
  
  const res = item.reservations && item.reservations[0];
  const isReserved = !!res;
  
  let isAdmin = false;
  let isMyReservation = false;

  if (currentUser) {
    const { data: currentProfile } = await sb.from('profiles').select('is_admin').eq('id', currentUser.id).single();
    isAdmin = currentProfile?.is_admin || false;
    isMyReservation = isReserved && res.user_id === currentUser.id;
  }

  // --- BOUTONS UTILISATEURS (Réserver / Annuler) ---
  let actionButtonHtml = "";
  if (!isReserved) {
    actionButtonHtml = `<button onclick="openReservationModal('${item.id}')" class="flex-1 py-4 bg-[#E0F2FE] hover:bg-[#CBE3F5] text-[#2980B9] border border-[#7FB3D5] rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition active:scale-95 cursor-pointer">🎁 Réserver ce cadeau</button>`;
  } else if (isMyReservation || isAdmin) {
    actionButtonHtml = `<button onclick="cancelReservation('${item.id}')" class="flex-1 py-4 bg-[#F9EBEA] border border-[#F5CBA7] text-[#A93226] hover:bg-[#FADBD8] rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition active:scale-95 cursor-pointer">🚫 Annuler ma réservation</button>`;
  } else {
    actionButtonHtml = `<button disabled class="flex-1 py-4 bg-[#F5EBE8] border border-[#E6D5CF] text-[#5C544D] rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed shadow-sm">🔒 Déjà réservé</button>`;
  }

  // --- BOUTONS ADMINISTRATEUR (Modifier / Supprimer) ---
  let adminButtonsHtml = "";
  if (isAdmin) {
    adminButtonsHtml = `
      <div class="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-stone-100">
        <button onclick="showEditForm('${item.id}')" class="flex-1 py-3 bg-[#FEF9E7] hover:bg-[#FCF3CF] text-[#B7950B] border border-[#F9E79F] rounded-xl font-black text-xs uppercase tracking-widest shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2">
          ⚙️ Modifier
        </button>
        <button onclick="deleteItem('${item.id}')" class="flex-1 py-3 bg-[#F9EBEA] hover:bg-[#FADBD8] text-[#A93226] border border-[#F5CBA7] rounded-xl font-black text-xs uppercase tracking-widest shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2">
          🗑️ Supprimer
        </button>
      </div>
    `;
  }

  document.getElementById('details-placeholder').style.display = 'none';
  
  const contentEl = document.getElementById('details-content');
  contentEl.style.display = 'block';
  contentEl.classList.remove('hidden');

  const panel = document.getElementById('details-panel');
  if(panel) panel.classList.remove('hidden');

  const defaultTeddy = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80";
  const imgUrl = (item.photo_url && item.photo_url.trim() !== "") ? item.photo_url : defaultTeddy;

  let texteCommentaireHTML = "";
  if (item.description) {
    texteCommentaireHTML = item.description.replace(/(?:\r\n|\r|\n)/g, '<br>');
  }

  const catColor = catConfig[item.cat_id]?.text || '#2980B9';

  contentEl.innerHTML = `
    <div class="mt-12 md:mt-4 mb-5 text-left">
      <button onclick="closeDetails()" class="bg-white border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2 hover:bg-stone-50 transition w-max cursor-pointer">
        ← Retour à la liste
      </button>
    </div>
    
    <div class="w-full mb-6 text-center">
       <img src="${imgUrl}" onerror="this.onerror=null; this.src='${defaultTeddy}';" class="w-full h-auto max-h-[calc(100vh-16rem)] object-contain rounded-[1.5rem] shadow-sm block" alt="${item.nom || 'Cadeau'}">
    </div>
    
    <div class="text-left mt-2">
        <h2 class="text-3xl font-black text-[#5C544D] leading-tight mb-4">${item.nom || "Cadeau"}</h2>
        
        ${texteCommentaireHTML ? `
          <div class="text-[15px] font-medium text-stone-500 leading-relaxed mb-6 whitespace-pre-wrap break-words">
            ${texteCommentaireHTML}
          </div>
        ` : ''}
        
        <div class="flex flex-wrap items-center gap-3 mb-6 mt-2">
          <div class="bg-white border px-3 py-2 rounded-xl flex items-center gap-1 text-xs shrink-0 shadow-sm" style="border-color: ${catConfig[item.cat_id]?.border || '#D4E6F1'}">
            <span class="font-black" style="color: ${catColor}">Prix :</span>
            <span class="font-black" style="color: ${catColor}">${item.prix || "0"} €</span>
          </div>
          
          <span class="inline-block px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-2xs ${isReserved ? 'bg-[#F5EBE8] text-[#5C544D] border border-[#E6D5CF]' : 'bg-white text-[#2980B9] border border-[#7FB3D5]'}">
            ${isReserved ? `🔒 Réservé par ${getReserverDisplay(res)}` : '✨ Disponible'}
          </span>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <a href="${item.lien || "#"}" target="_blank" class="flex-1 py-4 bg-white border border-[#D4E6F1] hover:bg-[#EAF4FC] text-[#2980B9] rounded-2xl font-black text-xs uppercase tracking-widest text-center transition shadow-sm">🔗 Voir sur le site</a>
          ${actionButtonHtml}
        </div>
        
        ${adminButtonsHtml}
    </div>
  `;
}

function closeDetails() {
  document.getElementById('details-placeholder').style.display = 'flex';
  const contentEl = document.getElementById('details-content');
  contentEl.style.display = 'none';
  contentEl.classList.add('hidden');

  const panel = document.getElementById('details-panel');
  // On remet le hidden de manière inconditionnelle. 
  // La classe 'lg:block' du HTML garantit qu'il restera visible sur ordinateur !
  if(panel) { 
    panel.classList.add('hidden'); 
  }
}

function openReservationModal(id) {
  selectedItemId = id; document.getElementById('custom-pseudo-input').value = ""; setReservationMode('public'); 
  const modal = document.getElementById('reservation-modal');
  modal.classList.remove('opacity-0', 'pointer-events-none'); modal.querySelector('div').classList.remove('translate-y-10');
}

function closeReservationModal() {
  const modal = document.getElementById('reservation-modal');
  modal.classList.add('opacity-0', 'pointer-events-none'); modal.querySelector('div').classList.add('translate-y-10');
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

  if (res.user_id !== currentUser.id && !isAdmin) {
    alert("Vous ne pouvez pas annuler la réservation de quelqu'un d'autre ! 😉");
    return;
  }

  const confirmation = confirm("Voulez-vous vraiment libérer ce cadeau pour les autres proches ? 🎁");
  if (!confirmation) return;

  const { error } = await sb.from('reservations').delete().eq('id', res.id);

  if (error) {
    alert("Erreur lors de l'annulation : " + error.message);
  } else {
    alert("Le cadeau est de nouveau disponible ! ✨");
    await loadItems(); 
    showDetail(itemId); 
  }
}

async function toggleAdminView() {
  document.getElementById('details-placeholder').style.display = 'none';
  const contentEl = document.getElementById('details-content');
  contentEl.style.display = 'block';
  contentEl.classList.remove('hidden');

  const panel = document.getElementById('details-panel');
  if(panel) { panel.classList.remove('hidden'); }

  const catOptions = Object.keys(catConfig).filter(k => k !== 'all').map(k => `<option value="${catConfig[k].id}">${catConfig[k].emoji} ${catConfig[k].label}</option>`).join('');

  contentEl.innerHTML = `
    <button onclick="closeDetails()" class="mt-12 md:mt-4 mb-5 bg-white border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2 hover:bg-stone-50 transition w-max cursor-pointer">← Retour</button>
    <h2 class="text-xl font-black text-[#5C544D] mb-4">🛠️ Espace Admin</h2>
    <hr class="border-stone-200 my-4">
    
    <div class="bg-[#F5FAFF] border border-[#D4E6F1] p-5 rounded-2xl text-left shadow-2xs">
      <h3 class="font-bold text-sm text-[#2980B9] mb-3">Ajouter un article :</h3>
      <input type="text" id="add-nom" placeholder="Nom du cadeau" class="w-full mb-2.5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white font-bold">
      <input type="number" id="add-prix" placeholder="Prix (€)" class="w-full mb-2.5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white">
      <input type="text" id="add-lien" placeholder="Lien marchand (https://...)" class="w-full mb-3 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white">
      
      <div class="mb-3 space-y-2">
        <label class="text-xs font-bold text-stone-500 block">Image du produit :</label>
        <label class="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-[#7FB3D5] hover:border-[#2980B9] rounded-xl cursor-pointer text-xs font-bold text-[#2980B9] transition shadow-2xs">
          <span class="text-base">📁</span> Parcourir mes fichiers / Photos
          <input type="file" accept="image/*" class="hidden" onchange="uploadAdminImage(event)">
        </label>
        <div id="upload-status" class="text-[11px] font-bold text-stone-400 italic hidden px-1"></div>
        <input type="text" id="add-photo" placeholder="Ou coller un lien URL (https://...)" class="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white">
      </div>

      <select id="add-cat" class="w-full mb-4 p-3 rounded-xl border border-stone-200 text-xs bg-white font-bold">${catOptions}</select>
      
      <textarea id="add-desc" placeholder="Un petit mot sur ce cadeau (Optionnel)..." class="w-full mb-5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white min-h-[80px] resize-y"></textarea>

      <button onclick="addNewItem()" class="w-full py-4 bg-[#7FB3D5] hover:bg-[#6CA1C3] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition active:scale-95 cursor-pointer mb-3">Publier l'objet</button>
    </div>
    <hr class="border-stone-200 my-4">
    <button onclick="renderAdminReservationsView()" class="w-full py-3 bg-white border-2 border-[#7FB3D5] hover:bg-[#EAF4FC] text-[#1F618D] rounded-xl font-black text-xs uppercase tracking-widest shadow-2xs transition active:scale-95 cursor-pointer">
      📋 Voir le suivi des réservations
    </button>
  `;
// --- SYSTÈME DE BROUILLON AUTOMATIQUE ---
  // 1. On récupère le brouillon s'il existe
  const draft = JSON.parse(localStorage.getItem('admin_draft') || '{}');
  if (draft.nom) document.getElementById('add-nom').value = draft.nom;
  if (draft.prix) document.getElementById('add-prix').value = draft.prix;
  if (draft.lien) document.getElementById('add-lien').value = draft.lien;
  if (draft.desc) document.getElementById('add-desc').value = draft.desc;

  // 2. On sauvegarde en temps réel à chaque touche pressée
  const saveDraft = () => {
    localStorage.setItem('admin_draft', JSON.stringify({
      nom: document.getElementById('add-nom').value,
      prix: document.getElementById('add-prix').value,
      lien: document.getElementById('add-lien').value,
      desc: document.getElementById('add-desc').value
    }));
  };

  document.getElementById('add-nom').addEventListener('input', saveDraft);
  document.getElementById('add-prix').addEventListener('input', saveDraft);
  document.getElementById('add-lien').addEventListener('input', saveDraft);
  document.getElementById('add-desc').addEventListener('input', saveDraft);
  
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
            <tr class="bg-stone-50 border-b border-stone-100 text-stone-500 font-black uppercase tracking-wider">
              <th class="p-3">Cadeau</th>
              <th class="p-3">Catégorie</th>
              <th class="p-3">Prix</th>
              <th class="p-3">Réservé par</th>
              <th class="p-3 text-center">Annuler</th>
            </tr>
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
                  <td class="p-3">
                    <span class="font-bold">${getReserverDisplay(res)}</span>
                  </td>
                  <td class="p-3 text-center">
                    <button onclick="cancelReservation('${item.id}'); setTimeout(renderAdminReservationsView, 500);" class="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center border border-red-200 text-sm transition mx-auto cursor-pointer" title="Annuler la réservation">🚫</button>
                  </td>
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
              <div class="flex justify-between items-start gap-2">
                <span class="font-black text-stone-800 text-sm leading-tight max-w-[70%]">${item.nom}</span>
                <span class="font-black text-stone-600 bg-white border border-stone-100 px-2 py-1 rounded-lg text-[10px] shrink-0">${item.prix} €</span>
              </div>
              
              <div class="flex items-center justify-between w-full mt-1 gap-2">
                <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span class="px-2 py-1 rounded-lg text-[10px] font-bold" style="background:${conf.bg || '#F2F3F4'}; color:${conf.text}">${conf.emoji} ${conf.label}</span>                  
                  <span class="text-stone-300 shrink-0">•</span>
                  <span class="text-stone-500 font-bold truncate">Par ${getReserverDisplay(res)}</span>
                </div>
                
                <button onclick="cancelReservation('${item.id}'); setTimeout(renderAdminReservationsView, 500);" class="w-9 h-9 rounded-full bg-[#F9EBEA] active:bg-[#FADBD8] text-[#A93226] border border-[#F5CBA7] flex items-center justify-center shrink-0 shadow-sm text-xs transition cursor-pointer" title="Annuler la réservation">
                  🚫
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  contentEl.innerHTML = `
    <button onclick="toggleAdminView()" class="mt-12 md:mt-4 mb-5 bg-white border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2 hover:bg-stone-50 transition w-max cursor-pointer">← Retour</button>
    <h2 class="text-xl font-black text-[#5C544D] mb-4">📋 Suivi des Réservations</h2>
    <hr class="border-stone-200 my-4">
    
    <div class="bg-white p-2 lg:p-4 rounded-2xl flex flex-col gap-4">
      <div class="mt-2">
        ${listHtml}
      </div>
    </div>
  `;
}

async function uploadAdminImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const statusDiv = document.getElementById('upload-status');
  const urlInput = document.getElementById('add-photo');
  statusDiv.classList.remove('hidden'); statusDiv.style.color = '#2980B9'; statusDiv.innerText = "⏳ Transfert en cours...";

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const fileName = `${Date.now()}_${cleanName}`;
    const { data, error } = await sb.storage.from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: pubData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    if (pubData && pubData.publicUrl) {
      urlInput.value = pubData.publicUrl;
      statusDiv.style.color = '#27AE60'; statusDiv.innerText = "✅ Image rattachée avec succès !";
    }
  } catch (err) {
    statusDiv.style.color = '#E74C3C'; statusDiv.innerText = `❌ Échec : ${err.message}`;
  }
}

async function addNewItem() {
  const nom = document.getElementById('add-nom').value; 
  const prix = document.getElementById('add-prix').value; 
  const lien = document.getElementById('add-lien').value; 
  const photo = document.getElementById('add-photo').value; 
  const cat_id = document.getElementById('add-cat').value;
  const desc = document.getElementById('add-desc').value.trim();

  if (!nom || !prix || !lien) { alert("Champs manquants !"); return; }
  
  const { error } = await sb.from('items').insert([{ 
    nom: nom, 
    prix: parseFloat(prix), 
    lien: lien, 
    photo_url: photo || null, 
    cat_id: cat_id,
    description: desc ? desc : null
  }]);
  
  if (!error) { 
    alert("Objet publié !"); 
    
    // 🧹 NETTOYAGE DU BROUILLON ICI
    localStorage.removeItem('admin_draft'); 
    
    await loadItems(); 
    closeDetails(); 
  } else { 
    alert("Erreur d'ajout : " + error.message); 
  }
}


// =========================================================================
//   OUTILS D'ADMINISTRATION : SUPPRESSION ET MODIFICATION
// =========================================================================

async function deleteItem(id) {
  const confirmation = confirm("⚠️ Êtes-vous sûr de vouloir supprimer définitivement cet objet de la liste ?\n\n(Toutes les réservations éventuelles seront aussi effacées)");
  if (!confirmation) return;

  // Par précaution, on supprime d'abord les réservations liées à cet objet
  await sb.from('reservations').delete().eq('item_id', id);

  // Puis on supprime l'objet lui-même
  const { error } = await sb.from('items').delete().eq('id', id);

  if (error) {
    alert("Erreur lors de la suppression : " + error.message);
  } else {
    alert("Cadeau supprimé avec succès ! 🗑️");
    await loadItems(); 
    closeDetails(); 
  }
}

function showEditForm(itemId) {
  const item = itemsData.find(i => i.id === itemId);
  if(!item) return;

  const contentEl = document.getElementById('details-content');

  // Pré-sélection de la catégorie actuelle
  const catOptions = Object.keys(catConfig).filter(k => k !== 'all').map(k => `<option value="${catConfig[k].id}" ${item.cat_id === catConfig[k].id ? 'selected' : ''}>${catConfig[k].emoji} ${catConfig[k].label}</option>`).join('');

  // On échappe les guillemets pour éviter de casser les champs de texte
  const safeNom = (item.nom || "").replace(/"/g, '&quot;');
  const safePrix = item.prix || "";
  const safeLien = (item.lien || "").replace(/"/g, '&quot;');
  const safePhoto = (item.photo_url || "").replace(/"/g, '&quot;');

  contentEl.innerHTML = `
    <button onclick="showDetail('${item.id}')" class="mt-12 md:mt-4 mb-5 bg-white border border-stone-200 text-stone-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2 hover:bg-stone-50 transition w-max cursor-pointer">← Annuler</button>
    <h2 class="text-xl font-black text-[#B7950B] mb-4">⚙️ Modifier l'objet</h2>
    <hr class="border-stone-200 my-4">

    <div class="bg-[#FEF9E7] border border-[#F9E79F] p-5 rounded-2xl text-left shadow-2xs">
      <input type="text" id="edit-nom" value="${safeNom}" placeholder="Nom du cadeau" class="w-full mb-2.5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white font-bold text-stone-700">
      <input type="number" id="edit-prix" value="${safePrix}" placeholder="Prix (€)" class="w-full mb-2.5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white text-stone-700">
      <input type="text" id="edit-lien" value="${safeLien}" placeholder="Lien marchand (https://...)" class="w-full mb-3 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white text-stone-700">

      <div class="mb-3 space-y-2">
        <label class="text-xs font-bold text-stone-500 block">Image du produit :</label>
        <label class="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-[#F1C40F] hover:border-[#F39C12] rounded-xl cursor-pointer text-xs font-bold text-[#F39C12] transition shadow-2xs">
          <span class="text-base">📁</span> Changer l'image
          <input type="file" accept="image/*" class="hidden" onchange="uploadEditImage(event)">
        </label>
        <div id="edit-upload-status" class="text-[11px] font-bold text-stone-400 italic hidden px-1"></div>
        <input type="text" id="edit-photo" value="${safePhoto}" placeholder="Ou URL (https://...)" class="w-full p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white text-stone-700">
      </div>

      <select id="edit-cat" class="w-full mb-4 p-3 rounded-xl border border-stone-200 text-xs bg-white font-bold text-stone-700">${catOptions}</select>

      <textarea id="edit-desc" placeholder="Un petit mot sur ce cadeau (Optionnel)..." class="w-full mb-5 p-3 rounded-xl border border-stone-200 text-xs outline-none bg-white min-h-[80px] resize-y text-stone-700">${item.description || ""}</textarea>

      <button onclick="saveItemChanges('${item.id}')" class="w-full py-4 bg-[#F1C40F] hover:bg-[#F39C12] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition active:scale-95 cursor-pointer">Enregistrer les modifications</button>
    </div>
  `;
}

async function uploadEditImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const statusDiv = document.getElementById('edit-upload-status');
  const urlInput = document.getElementById('edit-photo');
  statusDiv.classList.remove('hidden'); statusDiv.style.color = '#F39C12'; statusDiv.innerText = "⏳ Transfert en cours...";

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const fileName = `${Date.now()}_${cleanName}`;
    const { data, error } = await sb.storage.from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: pubData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    if (pubData && pubData.publicUrl) {
      urlInput.value = pubData.publicUrl;
      statusDiv.style.color = '#27AE60'; statusDiv.innerText = "✅ Nouvelle image rattachée !";
    }
  } catch (err) {
    statusDiv.style.color = '#E74C3C'; statusDiv.innerText = `❌ Échec : ${err.message}`;
  }
}

async function saveItemChanges(id) {
  const nom = document.getElementById('edit-nom').value;
  const prix = document.getElementById('edit-prix').value;
  const lien = document.getElementById('edit-lien').value;
  const photo = document.getElementById('edit-photo').value;
  const cat_id = document.getElementById('edit-cat').value;
  const desc = document.getElementById('edit-desc').value.trim();

  if (!nom || !prix || !lien) { alert("Certains champs obligatoires sont manquants !"); return; }

  const { error } = await sb.from('items').update({
    nom: nom,
    prix: parseFloat(prix),
    lien: lien,
    photo_url: photo || null,
    cat_id: cat_id,
    description: desc ? desc : null
  }).eq('id', id);

  if (error) {
    alert("Erreur lors de la modification : " + error.message);
  } else {
    alert("L'objet a été mis à jour avec succès ! ✨");
    await loadItems();
    showDetail(id); // Réaffiche la carte modifiée
  }
}

// =========================================================================
//   ACTUALISATION INVISIBLE EN ARRIÈRE-PLAN
// =========================================================================

async function backgroundRefresh() {
  // 🛡️ SÉCURITÉ 1 : L'application est-elle au premier plan et l'utilisateur connecté ?
  if (document.hidden || !currentUser) return; 

  // 🛡️ SÉCURITÉ 2 : L'utilisateur a-t-il une fenêtre ouverte (Admin, Détail, Modif, Réservation) ?
  const detailsEl = document.getElementById('details-content');
  const detailsOpen = detailsEl && !detailsEl.classList.contains('hidden') && detailsEl.style.display !== 'none';
  
  const modalEl = document.getElementById('reservation-modal');
  const modalOpen = modalEl && !modalEl.classList.contains('opacity-0');
  
  // S'il fait quelque chose, on annule l'actualisation pour ce cycle
  if (detailsOpen || modalOpen) return;

  // 2. On récupère les nouvelles données en silence
  const { data: newItems } = await sb.from('items').select('*').order('nom', { ascending: true });
  const { data: newReservations } = await sb.from('reservations').select('*');
  const { data: profiles } = await sb.from('profiles').select('*');

  if (!newItems) return;

  // 3. On reconstruit les données
  const newItemsData = newItems.map(item => {
    const itemRes = newReservations ? newReservations.filter(r => r.item_id === item.id) : [];
    if (itemRes.length > 0) {
      const res = itemRes[0];
      res.profiles = profiles ? profiles.find(p => p.id === res.user_id) : null;
    }
    item.reservations = itemRes;
    return item;
  });

  // 4. On compare : est-ce qu'il y a eu un changement depuis la dernière fois ?
  if (JSON.stringify(newItemsData) !== JSON.stringify(itemsData)) {
    itemsData = newItemsData; // Mise à jour de la mémoire
    
    // On sauvegarde la position exacte du défilement
    const sidebar = document.getElementById('left-sidebar');
    const currentScroll = sidebar.scrollTop;
    
    renderItemsLayout(); // On redessine la liste avec les nouveautés
    
    // On remet l'utilisateur exactement là où il était
    sidebar.scrollTop = currentScroll; 
  }
}

// On lance le radar silencieux toutes les 15 secondes (15000 ms)
setInterval(backgroundRefresh, 15000);

// =========================================================================
//   OUTILS D'ADMINISTRATION : MOD DEV
// =========================================================================

const DEV_MODE = false; const DEV_AS_MASTER = false;  
if (DEV_MODE) {
  document.getElementById('step-global').style.display = 'none';
  
  async function autoLoginDev() {
    const prenomAdmin = "Olivier"; 
    const cleanPrenom = prenomAdmin.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    
    const emailAdmin = `${cleanPrenom}@liste.bebe`;
    const emailInvite = "test@liste.bebe"; 

    const emailFinal = DEV_AS_MASTER ? emailAdmin : emailInvite;
    const passwordFinal = DEV_AS_MASTER ? "GO146489" : "123456";

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
