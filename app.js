/* ============================================================
   CONFIGURATION DES ÉQUIPES DU CLUB (Par Saison)
   ============================================================ */
const EQUIPES_CLUB = {
  "SM_A": {
    nom: "Senior Masculin A",
    saisons: {
      "2026-2027": "https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/nationale-3-masculine-2026-2027-32502/poule-190854/rencontre-2640089/",
      "2025-2026": "https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/nationale-3-masculine-2025-26-28559/poule-169509/rencontre-2399931/"
    }
  },
  "SM_B": {
    nom: "Senior Masculin B",
    saisons: {
      "2026-2027": "https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/m002-excellence-masculine-32523/poule-190995/rencontre-2641016/",
      "2025-2026": "https://www.ffhandball.fr/competitions/saison-2025-2026-21/regional/m002-excellence-masculine-28409/poule-168582/rencontre-2379993/"
    }
  },
  "SM_C": {
    nom: "Senior Masculin C",
    saisons: {
      "2026-2027": "https://www.ffhandball.fr/competitions/saison-2026-2027-22/regional/m004-1re-division-territoriale-masculine-32735/poule-192630/rencontre-2674902/",
      "2025-2026": "https://www.ffhandball.fr/competitions/saison-2025-2026-21/regional/m004-1re-division-territoriale-masculine-28930/poule-172193/rencontre-2429738/"
    }
  }
};

/* ============================================================
   CONSTANTES & ÉLÉMENTS DOM
   ============================================================ */
const WORKER_URL = "https://silent-salad-f4a2.handix-officiel.workers.dev/";
const LOGO_DEFAULT = "https://cdn-icons-png.flaticon.com/512/3358/3358994.png";

// DOM : Sélecteurs et Bouton
const teamSelect = document.getElementById("teamSelect");
const seasonSelect = document.getElementById("seasonSelect");
const btnCharger = document.getElementById("btnCharger");
const statusDiv = document.getElementById("status");

// DOM : Conteneurs
const listeMatchsContainer = document.getElementById("listeMatchsContainer");
const detailMatchContainer = document.getElementById("detailMatchContainer");
const vueEquipes = document.getElementById("vueEquipes");
const vueButeurs = document.getElementById("vueButeurs");

// DOM : Toggles Classement
const classementToggles = document.getElementById("classementToggles");
const btnTabEquipes = document.getElementById("btnTabEquipes");
const btnTabButeurs = document.getElementById("btnTabButeurs");
const subToggleButeurs = document.getElementById("subToggleButeurs");
const btnSortButs = document.getElementById("btnSortButs");
const btnSortRatio = document.getElementById("btnSortRatio");
const filterButeursContainer = document.getElementById("filterButeursContainer");
const teamFilterButeurs = document.getElementById("teamFilterButeurs");

// DOM : Navigation
const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");

// VARIABLES GLOBALES
let listeMatchsPoule = [];
let modeButeurs = "buts"; // "buts" ou "ratio"

/* ============================================================
   UTILITAIRES (CORRECTION LOGOS)
   ============================================================ */
function nettoyerUrlLogo(rawUrl) {
  if (!rawUrl) return LOGO_DEFAULT;
  
  const ta = document.createElement("textarea");
  ta.innerHTML = rawUrl;
  let decodedUrl = ta.value;

  decodedUrl = decodedUrl.replace(/\\/g, "");
  decodedUrl = decodedUrl.split(/["}{]/)[0];

  if (!decodedUrl.startsWith("http")) {
    if (decodedUrl.startsWith("/")) {
      decodedUrl = "https://media-logos-clubs.ffhandball.fr" + decodedUrl;
    } else {
      decodedUrl = "https://media-logos-clubs.ffhandball.fr/128/" + decodedUrl;
    }
  }

  decodedUrl = decodedUrl.replace(/\.(png|jpe?g)$/i, ".webp");
  return decodedUrl || LOGO_DEFAULT;
}

/* ============================================================
   INITIALISATION
   ============================================================ */
function init() {
  for (const [id, equipe] of Object.entries(EQUIPES_CLUB)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = equipe.nom;
    teamSelect.appendChild(option);
  }

  teamSelect.addEventListener("change", updateSeasonSelect);
  btnCharger.addEventListener("click", chargerDonnees);
  
  navItems.forEach(item => {
    item.addEventListener("click", () => switchTab(item.getAttribute("data-target")));
  });

  btnTabEquipes.addEventListener("click", () => showClassementTab("equipes"));
  btnTabButeurs.addEventListener("click", () => showClassementTab("buteurs"));
  btnSortButs.addEventListener("click", () => { modeButeurs = "buts"; updateButeursUI(); });
  btnSortRatio.addEventListener("click", () => { modeButeurs = "ratio"; updateButeursUI(); });
  teamFilterButeurs.addEventListener("change", genererClassementButeurs);
}

function updateSeasonSelect() {
  seasonSelect.innerHTML = "";
  const teamId = teamSelect.value;
  if (!teamId || !EQUIPES_CLUB[teamId]) return;

  const saisons = EQUIPES_CLUB[teamId].saisons;
  const saisonsKeys = Object.keys(saisons).sort().reverse();

  saisonsKeys.forEach(saison => {
    const option = document.createElement("option");
    option.value = saisons[saison];
    
    // Transforme "2025-2026" en "25/26"
    const annees = saison.split('-');
    let texteSaison = saison;
    if (annees.length === 2) {
      texteSaison = `${annees[0].slice(-2)}/${annees[1].slice(-2)}`;
    }
    
    option.textContent = texteSaison;
    seasonSelect.appendChild(option);
  });
}

function switchTab(targetId) {
  navItems.forEach(nav => nav.classList.remove("active"));
  const activeNav = document.querySelector(`[data-target="${targetId}"]`);
  if (activeNav) activeNav.classList.add("active");
  
  views.forEach(view => {
    view.style.display = view.id === targetId ? "block" : "none";
  });
}

function afficherStatus(message, type = "") {
  statusDiv.innerHTML = "";
  if (type === "loading") {
    statusDiv.innerHTML = `<div class="loading"><div class="spinner"></div><div>${message}</div></div>`;
  } else if (type === "error") {
    statusDiv.innerHTML = `<div class="error-message"><i class="ri-error-warning-line"></i> ${message}</div>`;
  } else if (type === "success") {
    statusDiv.innerHTML = `<div class="success-message"><i class="ri-checkbox-circle-line"></i> ${message}</div>`;
    setTimeout(() => statusDiv.innerHTML = "", 3000);
  }
}

/* ============================================================
   EXTRACTION DES DONNÉES
   ============================================================ */
function extraireDonnees(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  if (doc.querySelector('smartfire-component[name="page-404"]')) return null;

  const joueursComponent = doc.querySelector('smartfire-component[name="competitions---rencontre-liste-joueurs"]');
  if (!joueursComponent) return null;

  let attrJ = joueursComponent.getAttribute("attributes");
  if (!attrJ) return null;

  const ta = document.createElement("textarea");
  ta.innerHTML = attrJ;
  let joueursData;
  try { joueursData = JSON.parse(ta.value); } catch { return null; }

  const scoreComponent = doc.querySelector('smartfire-component[name="competitions---competition-score"]');
  let scoreData = null;
  if (scoreComponent) {
    let attrS = scoreComponent.getAttribute("attributes");
    if (attrS) {
      const taS = document.createElement("textarea");
      taS.innerHTML = attrS;
      try { scoreData = JSON.parse(taS.value); } catch {}
    }
  }

  const rematchComponent = doc.querySelector('smartfire-component[name="competitions---rematch"]');
  let rematchData = null;
  if (rematchComponent) {
    let attrR = rematchComponent.getAttribute("attributes");
    if (attrR) {
      const taR = document.createElement("textarea");
      taR.innerHTML = attrR;
      try { rematchData = JSON.parse(taR.value); } catch {}
    }
  }

  return { ...joueursData, score: scoreData, rematch: rematchData };
}

async function fetchMatch(url) {
  try {
    const proxyUrl = WORKER_URL + "?url=" + encodeURIComponent(url);
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;
    const html = await response.text();
    return html ? extraireDonnees(html) : null;
  } catch {
    return null;
  }
}

function ObtenirScoresMatch(m) {
  if (!m) return { s1: 0, s2: 0 };
  const id1 = m.equipe1?.id;
  const id2 = m.equipe2?.id;
  let s1Raw = m.score?.home?.score ?? (id1 ? m.statsJoueurs?.filter(j => String(j.equipeId) === String(id1)).reduce((t, j) => t + (parseInt(j.buts, 10) || 0), 0) : 0);
  let s2Raw = m.score?.away?.score ?? (id2 ? m.statsJoueurs?.filter(j => String(j.equipeId) === String(id2)).reduce((t, j) => t + (parseInt(j.buts, 10) || 0), 0) : 0);
  
  const s1 = parseInt(s1Raw, 10);
  const s2 = parseInt(s2Raw, 10);
  return { s1: isNaN(s1) ? 0 : Math.max(0, s1), s2: isNaN(s2) ? 0 : Math.max(0, s2) };
}

/* ============================================================
   LOGIQUE INTELLIGENTE DE CHARGEMENT
   ============================================================ */
/* ============================================================
   LOGIQUE INTELLIGENTE DE CHARGEMENT (Parallélisée)
   ============================================================ */
async function chargerDonnees() {
  const targetUrl = seasonSelect.value;
  if (!targetUrl) {
    afficherStatus("Veuillez sélectionner une équipe et une saison.", "error");
    return;
  }

  detailMatchContainer.innerHTML = `<div class="empty-state">Cliquez sur un match dans l'onglet "Poule" pour voir les statistiques.</div>`;
  listeMatchsPoule = [];
  
  btnCharger.disabled = true;
  teamSelect.disabled = true;
  seasonSelect.disabled = true;
  afficherStatus("Récupération de la poule en cours...", "loading");

  try {
    const matchInitial = await fetchMatch(targetUrl);
    if (!matchInitial) {
      afficherStatus("Impossible de charger les données.", "error");
      return; 
    }

    listeMatchsPoule.push(matchInitial);
    const urlParts = targetUrl.match(/(.*\/rencontre-)(\d+)(\/?.*)/);
    
    if (!urlParts) {
      afficherStatus("Format de l'URL non reconnu.", "error");
      return;
    }

    const baseUrl = urlParts[1];
    const baseId = parseInt(urlParts[2], 10);
    const endUrl = urlParts[3] || "";

    const { s1: s1Init, s2: s2Init } = ObtenirScoresMatch(matchInitial);
    let zeroScoreConsecutifs = (s1Init === 0 && s2Init === 0) ? 1 : 0;

    // SCAN VERS L'AVANT (Par lot de 5)
    let err = 0, currentId = baseId + 1;
    let stopScan = false;

    while (!stopScan && err < 6) {
      const batchPromises = [];
      for (let i = 0; i < 5; i++) {
        batchPromises.push(fetchMatch(`${baseUrl}${currentId + i}${endUrl}`));
      }

      const resultats = await Promise.all(batchPromises);

      for (let i = 0; i < resultats.length; i++) {
        const data = resultats[i];
        if (data) {
          err = 0; // Réinitialise les erreurs
          const { s1, s2 } = ObtenirScoresMatch(data);

          // Compteur de 0-0 consécutifs
          if (s1 === 0 && s2 === 0) {
            zeroScoreConsecutifs++;
          } else {
            zeroScoreConsecutifs = 0;
          }

          listeMatchsPoule.push(data);

          // Arrêt strict si 6 matchs 0-0 consécutifs
          if (zeroScoreConsecutifs >= 6) {
            stopScan = true;
            break; 
          }
        } else {
          err++;
          if (err >= 7) {
            stopScan = true;
            break;
          }
        }
      }
      currentId += 5;
    }

    // SCAN VERS L'ARRIÈRE (Par lot de 5)
    err = 0; 
    currentId = baseId - 1;
    stopScan = false;
    zeroScoreConsecutifs = (s1Init === 0 && s2Init === 0) ? 1 : 0;

    while (!stopScan && err < 6 && currentId > 0) {
      const batchPromises = [];
      let batchSize = 0;
      
      // Préparation du lot (en reculant)
      for (let i = 0; i < 5; i++) {
        const idToCheck = currentId - i;
        if (idToCheck > 0) {
          batchPromises.push(fetchMatch(`${baseUrl}${idToCheck}${endUrl}`));
          batchSize++;
        }
      }

      if (batchSize === 0) break;

      const resultats = await Promise.all(batchPromises);

      for (let i = 0; i < resultats.length; i++) {
        const data = resultats[i];
        if (data) {
          err = 0; 
          const { s1, s2 } = ObtenirScoresMatch(data);

          if (s1 === 0 && s2 === 0) {
            zeroScoreConsecutifs++;
          } else {
            zeroScoreConsecutifs = 0;
          }

          listeMatchsPoule.unshift(data);

          if (zeroScoreConsecutifs >= 5) {
            stopScan = true;
            break;
          }
        } else {
          err++;
          if (err >= 6) {
            stopScan = true;
            break;
          }
        }
      }
      currentId -= batchSize;
    }

    afficherStatus(`Terminé ! ${listeMatchsPoule.length} matchs trouvés.`, "success");
    
    // Tri final par date
    listeMatchsPoule.sort((a, b) => {
      const dA = a.rematch?.rencontre?.date ? new Date(a.rematch.rencontre.date.replace(" ", "T")) : 0;
      const dB = b.rematch?.rencontre?.date ? new Date(b.rematch.rencontre.date.replace(" ", "T")) : 0;
      return dA - dB;
    });

    updateTeamFilterButeurs();
    genererVuePoule();
    genererClassements();
    switchTab("vue-poule");

  } catch (error) {
    console.error(error);
    afficherStatus("Une erreur technique est survenue.", "error");
  } finally {
    btnCharger.disabled = false;
    teamSelect.disabled = false;
    seasonSelect.disabled = false;
  }
}

/* ============================================================
   RENDU VUE : POULE
   ============================================================ */
function genererVuePoule() {
  listeMatchsContainer.innerHTML = "";
  if(listeMatchsPoule.length === 0) {
    listeMatchsContainer.innerHTML = `<div class="empty-state">Aucun match trouvé.</div>`;
    return;
  }

  const matchsParJournee = {};
  
  listeMatchsPoule.forEach(m => {
    const journee = m.rematch?.rencontre?.journeeNumero || "NC";
    if (!matchsParJournee[journee]) {
      matchsParJournee[journee] = [];
    }
    matchsParJournee[journee].push(m);
  });

  const journeesTriees = Object.keys(matchsParJournee).sort((a, b) => {
    if (a === "NC") return 1;
    if (b === "NC") return -1;
    return parseInt(a) - parseInt(b);
  });

  journeesTriees.forEach(journee => {
    const blockJournee = document.createElement("div");
    blockJournee.className = "journee-block";

    const titreJournee = journee === "NC" ? "Matchs Hors Journées" : `Journée ${journee}`;
    blockJournee.innerHTML = `
      <div class="journee-header"><i class="ri-calendar-event-line" style="margin-right: 6px;"></i> ${titreJournee}</div>
      <div class="journee-matchs"></div>
    `;

    const containerMatchs = blockJournee.querySelector(".journee-matchs");

    matchsParJournee[journee].forEach((m) => {
      const eq1 = m.equipe1?.libelle || "Équipe 1";
      const eq2 = m.equipe2?.libelle || "Équipe 2";
      
      const rawLogo1 = m.rematch?.rencontre?.equipe1?.logo || m.score?.home?.logo || m.equipe1?.logo;
      const rawLogo2 = m.rematch?.rencontre?.equipe2?.logo || m.score?.away?.logo || m.equipe2?.logo;
      const logo1 = nettoyerUrlLogo(rawLogo1);
      const logo2 = nettoyerUrlLogo(rawLogo2);

      const { s1, s2 } = ObtenirScoresMatch(m);
      
      let dateStr = "Date inconnue";
      if (m.rematch?.rencontre?.date) {
        const d = new Date(m.rematch.rencontre.date.replace(" ", "T"));
        if (!isNaN(d.getTime())) {
          const jourMois = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
          const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          dateStr = `<i class="ri-time-line"></i> ${jourMois} à ${heure}`;
        }
      }

      let scoreHTML = `<div class="match-score-box">${s1} - ${s2}</div>`;
      if (s1 === 0 && s2 === 0) {
        scoreHTML = `<div class="match-score-box" style="background: var(--bg-color); color: var(--text-muted); border: 1px dashed var(--border-color);">À venir</div>`;
      }

      const card = document.createElement("div");
      card.className = "card match-card";
      card.innerHTML = `
        <div class="match-date">${dateStr}</div>
        <div class="match-row">
          <div class="match-team">
            <img src="${logo1}" alt="${eq1}" class="match-logo" onerror="this.src='${LOGO_DEFAULT}'">
            <div class="match-team-name">${eq1}</div>
          </div>
          ${scoreHTML}
          <div class="match-team">
            <img src="${logo2}" alt="${eq2}" class="match-logo" onerror="this.src='${LOGO_DEFAULT}'">
            <div class="match-team-name">${eq2}</div>
          </div>
        </div>
      `;
      
      card.addEventListener("click", () => {
        afficherMatchDetails(m);
        switchTab("vue-stats");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      containerMatchs.appendChild(card);
    });

    listeMatchsContainer.appendChild(blockJournee);
  });
}

/* ============================================================
   RENDU VUE : STATS
   ============================================================ */
function afficherMatchDetails(data) {
  detailMatchContainer.innerHTML = "";
  const { s1, s2 } = ObtenirScoresMatch(data);

  const rawLogo1 = data.rematch?.rencontre?.equipe1?.logo || data.score?.home?.logo || data.equipe1?.logo;
  const rawLogo2 = data.rematch?.rencontre?.equipe2?.logo || data.score?.away?.logo || data.equipe2?.logo;
  const logo1 = nettoyerUrlLogo(rawLogo1);
  const logo2 = nettoyerUrlLogo(rawLogo2);

  const matchHeaderHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <div class="match-row">
        <div class="match-team">
            <img src="${logo1}" class="match-logo" onerror="this.src='${LOGO_DEFAULT}'">
            <div class="match-team-name">${data.equipe1?.libelle || "Équipe 1"}</div>
        </div>
        <div class="match-score-box" style="font-size: 20px;">${s1} - ${s2}</div>
        <div class="match-team">
            <img src="${logo2}" class="match-logo" onerror="this.src='${LOGO_DEFAULT}'">
            <div class="match-team-name">${data.equipe2?.libelle || "Équipe 2"}</div>
        </div>
      </div>
    </div>
  `;

  const htmlEq1 = genererListeJoueurs(data.equipe1, data.statsJoueurs);
  const htmlEq2 = genererListeJoueurs(data.equipe2, data.statsJoueurs);

  detailMatchContainer.innerHTML = `
    ${matchHeaderHTML}
    ${htmlEq1}
    <div style="height: 16px;"></div>
    ${htmlEq2}
  `;
}

function genererListeJoueurs(equipe, joueurs) {
  if (!equipe || !joueurs) return "";
  const joueursEquipe = joueurs.filter(j => String(j.equipeId) === String(equipe.id));
  joueursEquipe.sort((a, b) => (parseInt(b.buts) || 0) - (parseInt(a.buts) || 0));

  let cartesJoueurs = joueursEquipe.map(j => {
    const prenomStr = j.prenom ? j.prenom.trim() : "";
    const prenomFormate = prenomStr ? prenomStr.charAt(0).toUpperCase() + prenomStr.slice(1).toLowerCase() : "";
    
    const nomFormate = j.nom ? j.nom.trim().toUpperCase() : "";
    
    const nbButs = parseInt(j.buts) || 0;
    const labelButs = nbButs <= 1 ? "but" : "buts";

    return `
    <div class="favorite-item">
      <div class="favorite-item-content">
        <div class="favorite-item-icon">${j.numero || "-"}</div>
        <div class="favorite-item-name">${prenomFormate} ${nomFormate}</div>
      </div>
      <div class="score-container" style="display: flex; align-items: baseline; gap: 4px;">
        <span class="match-score">${nbButs}</span>
        <span style="font-size: 11px; font-weight: 500; color: var(--bg-card);">${labelButs}</span>
      </div>
    </div>
    `;
  }).join("");

  if (joueursEquipe.length === 0) cartesJoueurs = `<div class="empty-state">Aucun joueur répertorié.</div>`;

  return `
    <div class="card">
      <div style="font-weight: 800; font-size: 15px; margin-bottom: 12px; color: var(--primary); text-align: center;">
        ${equipe.libelle}
      </div>
      <div>${cartesJoueurs}</div>
    </div>
  `;
}

/* ============================================================
   RENDU VUE : CLASSEMENT
   ============================================================ */
function updateTeamFilterButeurs() {
  teamFilterButeurs.innerHTML = `<option value="all" selected>Tous les clubs</option>`;
  const equipesNoms = new Set();
  
  listeMatchsPoule.forEach(m => {
    if (m.equipe1?.libelle) equipesNoms.add(m.equipe1.libelle);
    if (m.equipe2?.libelle) equipesNoms.add(m.equipe2.libelle);
  });

  Array.from(equipesNoms).sort().forEach(nom => {
    const option = document.createElement("option");
    option.value = nom;
    option.textContent = nom;
    teamFilterButeurs.appendChild(option);
  });
}

function genererClassements() {
  classementToggles.style.display = "block";
  genererClassementEquipes();
  genererClassementButeurs();
  showClassementTab("equipes");
}

function genererClassementEquipes() {
  const equipes = {};
  listeMatchsPoule.forEach(m => {
    if (!m.equipe1 || !m.equipe2) return;
    const id1 = m.equipe1.id, name1 = m.equipe1.libelle;
    const id2 = m.equipe2.id, name2 = m.equipe2.libelle;

    if (!equipes[id1]) equipes[id1] = { name: name1, pts: 0, j: 0, bp: 0, bc: 0 };
    if (!equipes[id2]) equipes[id2] = { name: name2, pts: 0, j: 0, bp: 0, bc: 0 };

    const { s1, s2 } = ObtenirScoresMatch(m);
    if (s1 > 0 || s2 > 0) {
      equipes[id1].j++; equipes[id2].j++;
      equipes[id1].bp += s1; equipes[id1].bc += s2;
      equipes[id2].bp += s2; equipes[id2].bc += s1;

      if (s1 > s2) { equipes[id1].pts += 3; equipes[id2].pts += 1; }
      else if (s1 < s2) { equipes[id2].pts += 3; equipes[id1].pts += 1; }
      else { equipes[id1].pts += 2; equipes[id2].pts += 2; }
    }
  });

  const classement = Object.values(equipes).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const diffA = a.bp - a.bc, diffB = b.bp - b.bc;
    return diffB !== diffA ? diffB - diffA : b.bp - a.bp;
  });

  let html = `<table><thead><tr><th>#</th><th style="text-align:left;">Équipe</th><th>Pts</th><th>J</th><th>Diff</th></tr></thead><tbody>`;
  classement.forEach((eq, idx) => {
    const diff = eq.bp - eq.bc;
    const diffText = diff > 0 ? `+${diff}` : diff;
    html += `<tr><td class="td-bold">${idx + 1}</td><td style="text-align:left;" class="td-bold">${eq.name}</td><td class="td-bold">${eq.pts}</td><td>${eq.j}</td><td>${diffText}</td></tr>`;
  });
  html += `</tbody></table>`;
  vueEquipes.innerHTML = html;
}

function genererClassementButeurs() {
  const joueurs = {};
  const selectedTeam = teamFilterButeurs.value;

  listeMatchsPoule.forEach(m => {
    if (!m.statsJoueurs) return;
    const { s1, s2 } = ObtenirScoresMatch(m);
    if (s1 === 0 && s2 === 0) return;

    const eqMap = {};
    if (m.equipe1) eqMap[String(m.equipe1.id)] = m.equipe1.libelle;
    if (m.equipe2) eqMap[String(m.equipe2.id)] = m.equipe2.libelle;

    m.statsJoueurs.forEach(j => {
      const nomEquipe = eqMap[String(j.equipeId)];
      
      if (selectedTeam !== "all" && nomEquipe !== selectedTeam) return;

      const key = `${j.prenom}_${j.nom}_${j.equipeId}`;
      const buts = parseInt(j.buts, 10) || 0;
      if (!joueurs[key]) {
        joueurs[key] = { nom: `${j.prenom || ""} ${j.nom || ""}`.trim(), equipe: nomEquipe, buts: 0, matchs: 0 };
      }
      joueurs[key].buts += buts;
      joueurs[key].matchs += 1;
    });
  });

  const listeJoueurs = Object.values(joueurs).map(j => ({ ...j, ratio: j.matchs > 0 ? (j.buts / j.matchs).toFixed(2) : 0 }));
  
  listeJoueurs.sort((a, b) => modeButeurs === "ratio" ? b.ratio - a.ratio || b.buts - a.buts : b.buts - a.buts || b.ratio - a.ratio);

  let html = `<table><thead><tr><th>#</th><th style="text-align:left;">Joueur</th><th>Buts</th><th>Moy.</th></tr></thead><tbody>`;
  
  if (listeJoueurs.length === 0) {
      html += `<tr><td colspan="4" class="empty-state" style="border: none;">Aucun buteur trouvé pour cette sélection.</td></tr>`;
  } else {
      listeJoueurs.slice(0, 50).forEach((j, idx) => {
        html += `<tr><td class="td-bold">${idx + 1}</td><td style="text-align:left;">
          <div class="td-bold">${j.nom}</div>
          <div style="font-size: 10px; color: var(--text-muted);">${j.equipe}</div>
        </td><td class="td-bold">${j.buts}</td><td>${j.ratio}</td></tr>`;
      });
  }
  
  html += `</tbody></table>`;
  vueButeurs.innerHTML = html;
}

function showClassementTab(tab) {
  if (tab === "equipes") {
    vueEquipes.style.display = "block"; 
    vueButeurs.style.display = "none"; 
    subToggleButeurs.style.display = "none";
    filterButeursContainer.style.display = "none";
    btnTabEquipes.classList.add("active"); 
    btnTabButeurs.classList.remove("active");
  } else {
    vueEquipes.style.display = "none"; 
    vueButeurs.style.display = "block"; 
    subToggleButeurs.style.display = "flex";
    filterButeursContainer.style.display = "flex";
    btnTabButeurs.classList.add("active"); 
    btnTabEquipes.classList.remove("active");
  }
}

function updateButeursUI() {
  if (modeButeurs === "buts") { btnSortButs.classList.add("active"); btnSortRatio.classList.remove("active"); } 
  else { btnSortRatio.classList.add("active"); btnSortButs.classList.remove("active"); }
  genererClassementButeurs();
}

// Lancement au chargement
init();
