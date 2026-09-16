/**
 * JAB TOWER DEFENSE — UI
 * -----------------------------------------------------------------------
 * Responsável por navegação entre telas e por renderizar cada tela a
 * partir do estado atual (player) e dos dados (JTD_DATA). Nenhuma regra
 * de negócio "pesada" mora aqui — isso fica em state.js / game.js.
 * -----------------------------------------------------------------------
 */

const JTD_UI = {
  currentScreen: "loading",
  currentStageId: null,     // fase selecionada no fluxo preview -> lobby -> battle
  rankingTab: "global",
  inventoryTab: "all",
};

/* =========================================================
   NAVEGAÇÃO
========================================================= */
function jtdShowScreen(screenId){
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
  const target = document.getElementById(`screen-${screenId}`);
  if (!target){
    console.warn(`JTD: tela "${screenId}" não existe.`);
    return;
  }
  target.classList.add("active");
  JTD_UI.currentScreen = screenId;

  // Cada tela é re-renderizada ao ser exibida, para refletir o estado mais recente.
  const renderers = {
    menu: jtdRenderMenu,
    profile: jtdRenderProfile,
    units: jtdRenderUnitsScreen,
    worlds: jtdRenderWorlds,
    ranking: jtdRenderRanking,
    inventory: jtdRenderInventory,
    missions: jtdRenderMissions,
    settings: jtdRenderSettings,
  };
  if (renderers[screenId]) renderers[screenId]();
}

/* =========================================================
   MENU PRINCIPAL
========================================================= */
function jtdRenderMenu(){
  const rank = jtdGetPlayerRank();
  const { level, xp, xpNeeded } = jtdGetLevelProgress();

  document.getElementById("menu-player-name").textContent = player.name;
  document.getElementById("menu-avatar-level").textContent = level;

  const rankTag = document.getElementById("menu-rank-tag");
  rankTag.textContent = rank.name;
  rankTag.style.color = rank.color;

  document.getElementById("menu-xp-fill").style.width = `${(xp / xpNeeded) * 100}%`;
  document.getElementById("menu-xp-label").textContent = `${xp} / ${xpNeeded} XP`;

  jtdRefreshCurrencyHud();

  // badge de missões prontas para resgatar
  const claimable = JTD_DATA.missionTemplates.filter(m => {
    const s = jtdGetMissionState(m);
    return s.done && !s.claimed;
  }).length;
  const badge = document.getElementById("menu-missions-badge");
  badge.hidden = claimable === 0;
  badge.textContent = claimable;
}

/* =========================================================
   PERFIL
========================================================= */
function jtdRenderProfile(){
  const rank = jtdGetPlayerRank();
  const stars = jtdGetPlayerStars();
  const { level, xp, xpNeeded } = jtdGetLevelProgress();
  const stats = player.statistics;

  document.getElementById("profile-name").textContent = player.name;

  const rankTag = document.getElementById("profile-rank-tag");
  rankTag.textContent = rank.name;
  rankTag.style.color = rank.color;

  const starsWrap = document.getElementById("profile-stars");
  starsWrap.innerHTML = "";
  for (let i = 1; i <= 5; i++){
    const s = document.createElement("span");
    s.className = "star" + (i <= stars ? " filled" : "");
    s.textContent = "★";
    starsWrap.appendChild(s);
  }

  document.getElementById("profile-xp-fill").style.width = `${(xp / xpNeeded) * 100}%`;
  document.getElementById("profile-xp-label").textContent = `${xp} / ${xpNeeded} XP`;

  document.getElementById("stat-level").textContent = level;
  document.getElementById("stat-wins").textContent = stats.wins;
  document.getElementById("stat-losses").textContent = stats.losses;
  document.getElementById("stat-stages").textContent = stats.stagesCompleted;
  document.getElementById("stat-highest-wave").textContent = stats.highestWave;
  document.getElementById("stat-playtime").textContent = jtdFormatMinutes(stats.playtimeSeconds);
  document.getElementById("stat-units").textContent = player.unlockedUnits.length;
}

function jtdFormatMinutes(totalSeconds){
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}m`;
}

function jtdFormatTime(totalSeconds){
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* =========================================================
   UNIDADES (ROSTER) — vazio por design; pronto para receber dados
========================================================= */
function jtdRenderUnitsScreen(){
  const grid = document.getElementById("units-grid");
  grid.innerHTML = "";
  // Placeholder: 12 slots vazios. Quando `player.unlockedUnits` /
  // um catálogo `JTD_DATA.units` existir, basta popular este grid com cards reais.
  for (let i = 0; i < 12; i++){
    const slot = document.createElement("div");
    slot.className = "slot-empty";
    slot.textContent = "EMPTY";
    grid.appendChild(slot);
  }
}

/* =========================================================
   MUNDOS / FASES
========================================================= */
function jtdRenderWorlds(){
  const container = document.getElementById("worlds-scroll");
  container.innerHTML = "";

  JTD_DATA.worlds.forEach(world => {
    const block = document.createElement("div");
    block.className = "world-block";

    const header = document.createElement("div");
    header.className = "world-header";
    header.innerHTML = `<h3>${world.name}</h3><span>"${world.subtitle}"</span>`;
    block.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "stage-grid";

    world.stages.forEach(stage => {
      const diff = jtdGetDifficulty(stage.difficulty);
      const progress = player.stageProgress[stage.id];
      const unlocked = stage.unlocked || (progress && progress.completed);

      const card = document.createElement("button");
      card.className = `stage-card ${diff.cssClass}${unlocked ? "" : " locked"}`;
      card.disabled = !unlocked;
      card.innerHTML = `
        <span class="stage-index mono">FASE ${String(stage.index).padStart(2, "0")}</span>
        <span class="stage-name">${stage.name}</span>
        <span class="stage-diff">${diff.name}</span>
        <span class="stage-status ${progress && progress.completed ? "completed" : ""}">
          ${progress && progress.completed ? "Concluída" : unlocked ? "Disponível" : "Bloqueada"}
        </span>
      `;
      if (unlocked){
        card.addEventListener("click", () => jtdOpenStagePreview(stage.id));
      }
      grid.appendChild(card);
    });

    block.appendChild(grid);
    container.appendChild(block);
  });
}

function jtdOpenStagePreview(stageId){
  JTD_UI.currentStageId = stageId;
  const found = jtdFindStage(stageId);
  if (!found) return;
  const { stage } = found;
  const diff = jtdGetDifficulty(stage.difficulty);
  const progress = player.stageProgress[stageId];

  document.getElementById("preview-stage-title").textContent = `FASE ${String(stage.index).padStart(2, "0")}`;
  document.getElementById("preview-difficulty").textContent = diff.name;
  document.getElementById("preview-difficulty").style.color = `var(--diff-${stage.difficulty === "jabpesadelo" ? "nightmare" : stage.difficulty})`;
  document.getElementById("preview-stage-name").textContent = stage.name;
  document.getElementById("preview-xp").textContent = `+${stage.xp} XP`;
  document.getElementById("preview-coins").textContent = `+${stage.coins} Coins`;

  document.getElementById("preview-best-score").textContent = progress ? progress.bestWave * 100 : "—";
  document.getElementById("preview-best-wave").textContent = progress ? progress.bestWave : "—";
  document.getElementById("preview-best-time").textContent = progress && progress.bestTimeSeconds != null
    ? jtdFormatTime(progress.bestTimeSeconds) : "—";

  jtdShowScreen("stage-preview");
}

/* =========================================================
   LOBBY
========================================================= */
function jtdRenderLobby(){
  const found = jtdFindStage(JTD_UI.currentStageId);
  if (!found) return;
  const { stage } = found;
  const diff = jtdGetDifficulty(stage.difficulty);

  document.getElementById("lobby-map").textContent = stage.name;
  document.getElementById("lobby-difficulty").textContent = diff.name;
  document.getElementById("lobby-starting-money").textContent = "500";

  const slotsWrap = document.getElementById("lobby-slots");
  slotsWrap.innerHTML = "";
  for (let i = 0; i < 6; i++){
    const slot = document.createElement("div");
    slot.className = "unit-slot";
    slot.textContent = "EMPTY SLOT";
    slotsWrap.appendChild(slot);
  }
}

/* =========================================================
   RANKING
========================================================= */
function jtdRenderRanking(){
  const list = document.getElementById("ranking-list");
  list.innerHTML = "";

  const key = { global: "level", level: "level", wins: "wins", wave: "highestWave", damage: "damage" }[JTD_UI.rankingTab];
  const sorted = [...JTD_DATA.mockRankingPlayers].sort((a, b) => b[key] - a[key]);

  sorted.forEach((p, i) => {
    const stars = Math.min(5, Math.max(1, Math.round(p.level / 20)));
    const row = document.createElement("div");
    row.className = "rank-row";
    row.innerHTML = `
      <span class="rank-position mono">#${i + 1}</span>
      <div style="flex:1">
        <div class="rank-name">${p.name}</div>
        <div class="stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</div>
      </div>
      <span class="rank-value mono">${jtdFormatRankingValue(key, p[key])}</span>
    `;
    list.appendChild(row);
  });
}

function jtdFormatRankingValue(key, value){
  if (key === "damage") return value.toLocaleString("pt-BR");
  if (key === "level") return `Lvl ${value}`;
  return value.toLocaleString("pt-BR");
}

/* =========================================================
   INVENTÁRIO
========================================================= */
function jtdRenderInventory(){
  const grid = document.getElementById("inventory-grid");
  grid.innerHTML = "";
  // Estrutura pronta: cada item futuro pode ser adicionado aqui filtrando
  // por JTD_UI.inventoryTab ("all" | "units" | "items" | "materials").
  for (let i = 0; i < 16; i++){
    const slot = document.createElement("div");
    slot.className = "slot-empty";
    slot.textContent = "EMPTY";
    grid.appendChild(slot);
  }
}

/* =========================================================
   MISSÕES
========================================================= */
function jtdRenderMissions(){
  const list = document.getElementById("missions-list");
  list.innerHTML = "";

  JTD_DATA.missionTemplates.forEach(mission => {
    const { progress, done, claimed } = jtdGetMissionState(mission);
    const pct = Math.min(100, (progress / mission.target) * 100);

    const card = document.createElement("div");
    card.className = "mission-card";
    card.innerHTML = `
      <div class="mission-top">
        <span class="mission-title">${mission.title}</span>
        <span class="mission-reward mono">+${mission.rewardXp} XP · +${mission.rewardCoins} Coins</span>
      </div>
      <div class="mission-progress-track"><div class="mission-progress-fill" style="width:${pct}%"></div></div>
      <div class="mission-bottom">
        <span class="mission-progress-label mono">${progress} / ${mission.target}</span>
        <button class="mission-claim" data-mission="${mission.id}" ${done && !claimed ? "" : "disabled"}>
          ${claimed ? "RESGATADO" : "CLAIM"}
        </button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll(".mission-claim").forEach(btn => {
    btn.addEventListener("click", () => {
      const ok = jtdClaimMission(btn.dataset.mission);
      if (ok){
        jtdShowToast("Recompensa resgatada!");
        jtdRenderMissions();
        jtdRefreshCurrencyHud();
      }
    });
  });
}

/* =========================================================
   CONFIGURAÇÕES
========================================================= */
function jtdRenderSettings(){
  const list = document.getElementById("settings-list");
  list.innerHTML = "";

  JTD_DATA.settingsSchema.forEach(group => {
    const title = document.createElement("div");
    title.className = "settings-group-title";
    title.textContent = group.group;
    list.appendChild(title);

    group.items.forEach(item => {
      if (player.settings[item.id] === undefined) player.settings[item.id] = item.default;
      const value = player.settings[item.id];

      const row = document.createElement("div");
      row.className = "setting-row";

      if (item.type === "toggle"){
        row.innerHTML = `<label>${item.label}</label>`;
        const toggle = document.createElement("div");
        toggle.className = "toggle" + (value ? " on" : "");
        toggle.addEventListener("click", () => {
          player.settings[item.id] = !player.settings[item.id];
          jtdSaveGame();
          jtdRenderSettings();
        });
        row.appendChild(toggle);
      } else if (item.type === "slider"){
        row.innerHTML = `<label>${item.label}</label>`;
        const slider = document.createElement("input");
        slider.type = "range"; slider.className = "slider";
        slider.min = item.min; slider.max = item.max; slider.value = value;
        slider.addEventListener("input", () => {
          player.settings[item.id] = Number(slider.value);
          jtdSaveGame();
        });
        row.appendChild(slider);
      } else if (item.type === "select"){
        row.innerHTML = `<label>${item.label}</label>`;
        const select = document.createElement("select");
        select.className = "select-mini";
        item.options.forEach(opt => {
          const option = document.createElement("option");
          option.value = opt; option.textContent = opt;
          if (opt === value) option.selected = true;
          select.appendChild(option);
        });
        select.addEventListener("change", () => {
          player.settings[item.id] = select.value;
          jtdSaveGame();
        });
        row.appendChild(select);
      }
      list.appendChild(row);
    });
  });
}

/* =========================================================
   RESULTADO (vitória / derrota)
========================================================= */
function jtdRenderResult({ victory, wave, xpResult, coinsGained, enemiesDefeated, damageDealt, timeSeconds }){
  const title = document.getElementById("result-title");
  title.textContent = victory ? "VICTORY" : "DEFEAT";
  title.classList.toggle("defeat", !victory);

  document.getElementById("result-wave-label").textContent = `WAVE ${wave}`;
  document.getElementById("result-xp-gained").textContent = `+${xpResult.gained}`;
  document.getElementById("result-xp-before").textContent = `${xpResult.before.xp} XP`;
  document.getElementById("result-xp-after").textContent = `${xpResult.after.xp} XP`;

  const xpNeededAfter = jtdXpToNextLevel(xpResult.after.level);
  document.getElementById("result-xp-fill").style.width = `${(xpResult.after.xp / xpNeededAfter) * 100}%`;

  const rank = jtdGetPlayerRank(xpResult.after.level);
  const rankTag = document.getElementById("result-rank-tag");
  rankTag.textContent = rank.name;
  rankTag.style.color = rank.color;

  document.getElementById("result-coins").textContent = `+${coinsGained}`;
  document.getElementById("result-enemies").textContent = enemiesDefeated;
  document.getElementById("result-damage").textContent = damageDealt.toLocaleString("pt-BR");
  document.getElementById("result-highest-wave").textContent = wave;
  document.getElementById("result-time").textContent = jtdFormatTime(timeSeconds);

  jtdShowScreen("result");

  if (xpResult.leveledUp) jtdShowToast(`Você alcançou o nível ${xpResult.after.level}!`);
  if (xpResult.rankChanged) jtdShowToast(`Nova classificação: ${rank.name}`);
}

/* =========================================================
   TOASTS
========================================================= */
function jtdShowToast(message){
  const stack = document.getElementById("toast-stack");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
