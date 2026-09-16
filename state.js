/**
 * JAB TOWER DEFENSE — STATE
 * -----------------------------------------------------------------------
 * Fonte única da verdade para o progresso do jogador nesta primeira
 * versão. Mantém o objeto `player`, funções de XP/nível/classificação,
 * economia (moedas/gemas) e o sistema de save/load em localStorage.
 *
 * Estruturas de dados conceituais (prontas para crescer):
 *   player   { name, level, xp, coins, gems, statistics, unlockedUnits,
 *              stageProgress, missionProgress, settings }
 *   units    []   -> preenchido futuramente (data.js / novo arquivo)
 *   stages   -> ver JTD_DATA.worlds em data.js
 *   missions -> ver JTD_DATA.missionTemplates em data.js
 * -----------------------------------------------------------------------
 */

const JTD_SAVE_KEY = "jtd_save_v1";

/* =========================================================
   PLAYER — estado padrão de um jogador novo
========================================================= */
function jtdCreateDefaultPlayer(){
  return {
    name: "JOGADOR",
    level: 1,
    xp: 0,
    coins: 1000,
    gems: 100,
    unlockedUnits: [],          // ids de unidades desbloqueadas (vazio por enquanto)
    stageProgress: {},          // { [stageId]: { completed, bestScore, bestWave, bestTimeSeconds } }
    missionProgress: {},        // { [missionId]: { claimed } }
    settings: {},               // preenchido a partir de JTD_DATA.settingsSchema no primeiro load
    statistics: {
      wins: 0,
      losses: 0,
      stagesCompleted: 0,
      highestWave: 0,
      enemiesDefeated: 0,
      damageDealt: 0,
      playtimeSeconds: 0,
    },
  };
}

let player = jtdCreateDefaultPlayer();

/* =========================================================
   CURVA DE XP
   Fórmula simples e fácil de rebalancear no futuro:
   XP necessário para SAIR do nível N = 100 + (N-1) * 60
========================================================= */
function jtdXpToNextLevel(level){
  return 100 + (level - 1) * 60;
}

/** Recalcula level a partir do xp acumulado "livre" (xp dentro do nível atual). */
function jtdGetLevelProgress(){
  return {
    level: player.level,
    xp: player.xp,
    xpNeeded: jtdXpToNextLevel(player.level),
  };
}

/** Retorna a classificação (rank/título) correspondente ao nível atual. */
function jtdGetPlayerRank(level = player.level){
  let current = JTD_DATA.playerRanks[0];
  for (const rank of JTD_DATA.playerRanks){
    if (level >= rank.minLevel) current = rank;
  }
  return current;
}

/** Quantas "estrelas" visuais (1 a 5) mostrar para o rank atual, para fins de UI de perfil. */
function jtdGetPlayerStars(level = player.level){
  const idx = JTD_DATA.playerRanks.findIndex(r => r.id === jtdGetPlayerRank(level).id);
  return Math.min(5, idx + 1);
}

/**
 * Adiciona XP ao jogador, processando subidas de nível múltiplas se necessário.
 * Retorna um resumo do que mudou, útil para a tela de resultado.
 */
function jtdAddXp(amount){
  const before = { level: player.level, xp: player.xp, rank: jtdGetPlayerRank().id };
  player.xp += amount;

  let leveledUp = false;
  while (player.xp >= jtdXpToNextLevel(player.level)){
    player.xp -= jtdXpToNextLevel(player.level);
    player.level += 1;
    leveledUp = true;
  }

  const after = { level: player.level, xp: player.xp, rank: jtdGetPlayerRank().id };
  jtdSaveGame();
  return { before, after, gained: amount, leveledUp, rankChanged: before.rank !== after.rank };
}

/* =========================================================
   ECONOMIA
========================================================= */
function jtdAddCoins(amount){ player.coins = Math.max(0, player.coins + amount); jtdRefreshCurrencyHud(); jtdSaveGame(); }
function jtdRemoveCoins(amount){ player.coins = Math.max(0, player.coins - amount); jtdRefreshCurrencyHud(); jtdSaveGame(); }
function jtdAddGems(amount){ player.gems = Math.max(0, player.gems + amount); jtdRefreshCurrencyHud(); jtdSaveGame(); }
function jtdRemoveGems(amount){ player.gems = Math.max(0, player.gems - amount); jtdRefreshCurrencyHud(); jtdSaveGame(); }

function jtdRefreshCurrencyHud(){
  const coinsEl = document.getElementById("hud-coins");
  const gemsEl = document.getElementById("hud-gems");
  if (coinsEl) coinsEl.textContent = player.coins.toLocaleString("pt-BR");
  if (gemsEl) gemsEl.textContent = player.gems.toLocaleString("pt-BR");
}

/* =========================================================
   ESTATÍSTICAS / PROGRESSO DE FASE
========================================================= */
function jtdRegisterStageResult({ stageId, victory, wave, timeSeconds, enemiesDefeated, damageDealt }){
  const stats = player.statistics;

  if (victory) stats.wins += 1; else stats.losses += 1;
  stats.highestWave = Math.max(stats.highestWave, wave);
  stats.enemiesDefeated += enemiesDefeated;
  stats.damageDealt += damageDealt;
  stats.playtimeSeconds += timeSeconds;

  if (!player.stageProgress[stageId]){
    player.stageProgress[stageId] = { completed: false, bestScore: 0, bestWave: 0, bestTimeSeconds: null };
  }
  const progress = player.stageProgress[stageId];
  if (victory && !progress.completed){
    progress.completed = true;
    stats.stagesCompleted += 1;
  }
  progress.bestWave = Math.max(progress.bestWave, wave);
  if (victory && (progress.bestTimeSeconds === null || timeSeconds < progress.bestTimeSeconds)){
    progress.bestTimeSeconds = timeSeconds;
  }

  jtdSaveGame();
}

/* =========================================================
   MISSÕES — progresso é derivado das estatísticas em tempo real
========================================================= */
function jtdGetMissionState(mission){
  const raw = player.statistics[mission.progressKey] || 0;
  const progress = Math.min(raw, mission.target);
  const done = progress >= mission.target;
  const claimed = !!(player.missionProgress[mission.id] && player.missionProgress[mission.id].claimed);
  return { progress, done, claimed };
}

function jtdClaimMission(missionId){
  const mission = JTD_DATA.missionTemplates.find(m => m.id === missionId);
  if (!mission) return false;
  const state = jtdGetMissionState(mission);
  if (!state.done || state.claimed) return false;

  player.missionProgress[missionId] = { claimed: true };
  jtdAddCoins(mission.rewardCoins);
  jtdAddXp(mission.rewardXp);
  jtdSaveGame();
  return true;
}

/* =========================================================
   SAVE / LOAD / RESET (localStorage)
========================================================= */
function jtdSaveGame(){
  try{
    localStorage.setItem(JTD_SAVE_KEY, JSON.stringify(player));
  }catch(err){
    console.warn("JTD: falha ao salvar o jogo.", err);
  }
}

function jtdLoadGame(){
  try{
    const raw = localStorage.getItem(JTD_SAVE_KEY);
    if (!raw) { player = jtdCreateDefaultPlayer(); return; }
    const parsed = JSON.parse(raw);
    // merge raso com o default, garante compatibilidade se novos campos forem
    // adicionados ao objeto player em versões futuras do jogo.
    player = Object.assign(jtdCreateDefaultPlayer(), parsed);
    player.statistics = Object.assign(jtdCreateDefaultPlayer().statistics, parsed.statistics || {});
  }catch(err){
    console.warn("JTD: falha ao carregar save, iniciando novo jogo.", err);
    player = jtdCreateDefaultPlayer();
  }
}

function jtdResetGame(){
  localStorage.removeItem(JTD_SAVE_KEY);
  player = jtdCreateDefaultPlayer();
}
