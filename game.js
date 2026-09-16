/**
 * JAB TOWER DEFENSE — GAME (BATTLE ENGINE v1)
 * -----------------------------------------------------------------------
 * Este arquivo é o "orquestrador" da batalha: mantém o estado da
 * partida (`JTD_GAME`), roda o game loop real (requestAnimationFrame),
 * desenha tudo em um <canvas>, processa a colocação de torres e liga
 * o resultado da partida ao sistema de XP/economia/estatísticas já
 * existente em state.js.
 *
 * O COMPORTAMENTO de cada entidade (inimigo, torre, projétil) mora em
 * js/battle/enemy.js, js/battle/tower.js e js/battle/projectile.js —
 * este arquivo só orquestra: quando spawnar, quando atirar, quando a
 * wave terminou, quando a partida acabou.
 *
 * Nada aqui cria um segundo sistema de economia/XP/player: toda
 * recompensa de FASE (coins/xp meta) continua passando por
 * `jtdAddCoins` / `jtdAddXp` (state.js). O "dinheiro" que aparece
 * durante a batalha (`JTD_GAME.money`) é o dinheiro tático da PARTIDA
 * — o mesmo conceito que já existia no protótipo anterior — usado só
 * para comprar/upgradar/vender torres; ele nunca é salvo, some ao sair
 * da batalha, e não deve ser confundido com `player.coins`.
 * -----------------------------------------------------------------------
 */

/* =========================================================
   CONSTANTES DE POSICIONAMENTO (espaço virtual do mapa)
========================================================= */
const JTD_MAP_MARGIN = 24;         // não pode construir muito perto da borda
const JTD_MIN_PATH_CLEARANCE = 46; // distância mínima até o caminho
const JTD_MIN_TOWER_SPACING = 54;  // distância mínima entre torres
const JTD_TOWER_CLICK_RADIUS = 24; // raio de clique para selecionar uma torre já construída

/* =========================================================
   ESTADO DA BATALHA
========================================================= */
const JTD_GAME = {
  active: false,
  paused: false,

  stageId: null,
  map: null,

  currentWave: 0,
  totalWaves: 10,
  waveConfig: [],
  waveInProgress: false,
  spawnQueue: [],   // [{ type, atMs }] — atMs é relativo ao início do spawn da wave
  spawnClockMs: 0,

  hp: 100,
  money: 500,

  enemies: [],
  towers: [],
  projectiles: [],
  selectedTowerId: null,
  placement: null,  // { typeId, x, y, valid } em coordenadas de mapa, ou null

  elapsedSeconds: 0,
  lastFrameTime: null,
  rafHandle: null,
  speedMultiplier: 1, // arquitetura pronta para 2x/3x — ver jtdCycleSpeed()

  stats: { enemiesDefeated: 0, damageDealt: 0 },

  // canvas / transform mapa -> tela
  canvas: null,
  ctx: null,
  canvasCssWidth: 0,
  canvasCssHeight: 0,
  scale: 1,
  offsetX: 0,
  offsetY: 0,

  _inputBound: false,
};

/* =========================================================
   INÍCIO DE PARTIDA
========================================================= */
function jtdStartBattle(stageId){
  const found = jtdFindStage(stageId);
  if (!found) return;
  const { stage } = found;
  const map = jtdGetMap(stage.mapId);

  Object.assign(JTD_GAME, {
    active: true,
    paused: false,
    stageId,
    map,
    currentWave: 0,
    totalWaves: stage.waves,
    waveConfig: jtdGenerateWaveConfig(stage.waves),
    waveInProgress: false,
    spawnQueue: [],
    spawnClockMs: 0,
    hp: 100,
    money: 500,
    enemies: [],
    towers: [],
    projectiles: [],
    selectedTowerId: null,
    placement: null,
    elapsedSeconds: 0,
    lastFrameTime: null,
    speedMultiplier: 1,
    stats: { enemiesDefeated: 0, damageDealt: 0 },
  });

  // a tela precisa estar visível ANTES de medir o canvas (senão clientWidth/Height = 0)
  jtdShowScreen("battle");
  jtdSetupCanvas();
  jtdRenderTowerShop();

  document.getElementById("btn-start-wave").disabled = false;
  document.getElementById("wave-info-number").textContent = "1";
  document.getElementById("wave-info-desc").textContent = "Pressione START WAVE para começar.";
  document.getElementById("exit-confirm-overlay").hidden = true;
  document.getElementById("pause-overlay").hidden = true;
  document.getElementById("unit-panel-overlay").hidden = true;

  jtdUpdateBattleHud();
  jtdInitBattleInput(); // idempotente — só liga os listeners na primeira vez

  cancelAnimationFrame(JTD_GAME.rafHandle);
  JTD_GAME.rafHandle = requestAnimationFrame(jtdGameLoop);
}

/* =========================================================
   CANVAS / TRANSFORMAÇÃO MAPA <-> TELA
   O mapa é definido em um espaço virtual fixo (map.width x
   map.height). Aqui calculamos uma escala uniforme (letterbox,
   centralizada) para que o mesmo mapa funcione em qualquer
   tamanho de tela sem distorcer círculos/alcances.
========================================================= */
function jtdSetupCanvas(){
  const canvas = document.getElementById("battle-canvas");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // desenhamos sempre em pixels CSS

  JTD_GAME.canvas = canvas;
  JTD_GAME.ctx = ctx;
  JTD_GAME.canvasCssWidth = rect.width;
  JTD_GAME.canvasCssHeight = rect.height;

  jtdResolveMapScale();
  if (JTD_GAME.active) jtdRenderBattleFrame();
}

function jtdResolveMapScale(){
  const map = JTD_GAME.map;
  if (!map || !JTD_GAME.canvasCssWidth) return;

  const scale = Math.min(
    JTD_GAME.canvasCssWidth / map.width,
    JTD_GAME.canvasCssHeight / map.height
  );
  JTD_GAME.scale = scale;
  JTD_GAME.offsetX = (JTD_GAME.canvasCssWidth - map.width * scale) / 2;
  JTD_GAME.offsetY = (JTD_GAME.canvasCssHeight - map.height * scale) / 2;
}

function jtdMapToScreen(pt){
  return { x: pt.x * JTD_GAME.scale + JTD_GAME.offsetX, y: pt.y * JTD_GAME.scale + JTD_GAME.offsetY };
}
function jtdScreenToMap(pt){
  return { x: (pt.x - JTD_GAME.offsetX) / JTD_GAME.scale, y: (pt.y - JTD_GAME.offsetY) / JTD_GAME.scale };
}

/* =========================================================
   ENTRADA (mouse/teclado) — ligada UMA VEZ só
========================================================= */
function jtdInitBattleInput(){
  if (JTD_GAME._inputBound) return;
  JTD_GAME._inputBound = true;

  const canvas = document.getElementById("battle-canvas");

  canvas.addEventListener("mousemove", (e) => {
    if (!JTD_GAME.active || !JTD_GAME.placement) return;
    const rect = canvas.getBoundingClientRect();
    const mapPt = jtdScreenToMap({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    JTD_GAME.placement.x = mapPt.x;
    JTD_GAME.placement.y = mapPt.y;
    JTD_GAME.placement.valid = jtdIsValidPlacement(JTD_GAME.map, JTD_GAME.towers, mapPt.x, mapPt.y);
  });

  canvas.addEventListener("click", (e) => {
    if (!JTD_GAME.active) return;
    const rect = canvas.getBoundingClientRect();
    const mapPt = jtdScreenToMap({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (JTD_GAME.placement){
      jtdConfirmPlacement(mapPt);
      return;
    }
    jtdHandleBattleClick(mapPt);
  });

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    JTD_GAME.placement = null;
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && JTD_GAME.placement){
      JTD_GAME.placement = null;
    }
  });

  window.addEventListener("resize", () => {
    if (document.getElementById("screen-battle").classList.contains("active")){
      jtdSetupCanvas();
    }
  });
}

function jtdConfirmPlacement(mapPt){
  if (!JTD_GAME.placement.valid){
    jtdShowToast("Posição inválida para construir.");
    return;
  }
  const type = jtdGetTowerType(JTD_GAME.placement.typeId);
  JTD_GAME.money -= type.cost;
  JTD_GAME.towers.push(jtdCreateTower(JTD_GAME.placement.typeId, mapPt.x, mapPt.y));
  JTD_GAME.placement = null;
  jtdUpdateBattleHud();
}

function jtdHandleBattleClick(mapPt){
  const clicked = JTD_GAME.towers.find(t => Math.hypot(t.x - mapPt.x, t.y - mapPt.y) <= JTD_TOWER_CLICK_RADIUS);
  JTD_GAME.towers.forEach(t => { t.selected = false; });

  if (clicked){
    clicked.selected = true;
    jtdOpenTowerPanel(clicked);
  } else {
    jtdCloseUnitPanel();
  }
}

/* =========================================================
   VALIDAÇÃO DE POSICIONAMENTO
========================================================= */
function jtdDistPointToSegment(p, a, b){
  const abx = b.x - a.x, aby = b.y - a.y;
  const apx = p.x - a.x, apy = p.y - a.y;
  const abLenSq = abx * abx + aby * aby;
  let t = abLenSq > 0 ? (apx * abx + apy * aby) / abLenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + abx * t, cy = a.y + aby * t;
  return Math.hypot(p.x - cx, p.y - cy);
}

function jtdIsValidPlacement(map, towers, x, y){
  if (x < JTD_MAP_MARGIN || x > map.width - JTD_MAP_MARGIN) return false;
  if (y < JTD_MAP_MARGIN || y > map.height - JTD_MAP_MARGIN) return false;

  for (let i = 0; i < map.path.length - 1; i++){
    if (jtdDistPointToSegment({ x, y }, map.path[i], map.path[i + 1]) < JTD_MIN_PATH_CLEARANCE) return false;
  }
  for (const tower of towers){
    if (Math.hypot(tower.x - x, tower.y - y) < JTD_MIN_TOWER_SPACING) return false;
  }
  return true;
}

/* =========================================================
   LOJA DE TORRES (barra inferior da batalha)
========================================================= */
function jtdRenderTowerShop(){
  const wrap = document.getElementById("tower-shop");
  wrap.innerHTML = "";
  Object.values(JTD_DATA.towerTypes).forEach(type => {
    const card = document.createElement("button");
    card.className = "tower-card";
    card.innerHTML = `<span class="tower-card-name">${type.name}</span><span class="tower-card-cost mono">$${type.cost}</span>`;
    card.addEventListener("click", () => jtdEnterPlacementMode(type.id));
    wrap.appendChild(card);
  });
}

function jtdEnterPlacementMode(typeId){
  if (!JTD_GAME.active) return;
  const type = jtdGetTowerType(typeId);
  if (JTD_GAME.money < type.cost){
    jtdShowToast("Dinheiro insuficiente.");
    return;
  }
  JTD_GAME.placement = { typeId, x: null, y: null, valid: false };
}

/* =========================================================
   PAINEL DA TORRE (reaproveita o overlay que já existia)
========================================================= */
function jtdOpenTowerPanel(tower){
  JTD_GAME.selectedTowerId = tower.id;
  jtdRenderTowerPanel(tower);
  document.getElementById("unit-panel-overlay").hidden = false;
}

function jtdRenderTowerPanel(tower){
  const current = jtdGetTowerLevelInfo(tower);
  const next = jtdGetTowerNextLevelInfo(tower);

  document.getElementById("unit-panel-title").textContent = tower.name;
  document.getElementById("unit-panel-level").textContent = tower.level;
  document.getElementById("unit-panel-damage").textContent = tower.damage;
  document.getElementById("unit-panel-range").textContent = Math.round(tower.range);
  document.getElementById("unit-panel-atkspeed").textContent = `${tower.attackSpeed.toFixed(2)}/s`;
  document.getElementById("unit-panel-target").textContent = tower.targetMode;
  document.getElementById("unit-panel-sell-value").textContent = `($${jtdGetTowerSellValue(tower)})`;

  const upgradeBtn = document.getElementById("unit-panel-upgrade");
  const upgradeCostEl = document.getElementById("unit-panel-upgrade-cost");
  if (next){
    upgradeCostEl.textContent = `($${current.upgradeCost})`;
    upgradeBtn.disabled = JTD_GAME.money < current.upgradeCost;
  } else {
    upgradeCostEl.textContent = "(MAX)";
    upgradeBtn.disabled = true;
  }
}

/** Fecha o painel de torre e desseleciona tudo. Mantém o nome usado desde o protótipo anterior. */
function jtdCloseUnitPanel(){
  document.getElementById("unit-panel-overlay").hidden = true;
  JTD_GAME.towers.forEach(t => { t.selected = false; });
  JTD_GAME.selectedTowerId = null;
}

function jtdUpgradeSelectedTower(){
  const tower = JTD_GAME.towers.find(t => t.id === JTD_GAME.selectedTowerId);
  if (!tower) return;
  const current = jtdGetTowerLevelInfo(tower);
  const next = jtdGetTowerNextLevelInfo(tower);

  if (!next){ jtdShowToast("Torre já está no nível máximo."); return; }
  if (JTD_GAME.money < current.upgradeCost){ jtdShowToast("Dinheiro insuficiente."); return; }

  JTD_GAME.money -= current.upgradeCost;
  jtdUpgradeTower(tower);
  jtdRenderTowerPanel(tower);
  jtdUpdateBattleHud();
}

function jtdSellSelectedTower(){
  const tower = JTD_GAME.towers.find(t => t.id === JTD_GAME.selectedTowerId);
  if (!tower) return;

  const value = jtdGetTowerSellValue(tower);
  JTD_GAME.money += value;
  JTD_GAME.towers = JTD_GAME.towers.filter(t => t.id !== tower.id);
  jtdCloseUnitPanel();
  jtdUpdateBattleHud();
  jtdShowToast(`Torre vendida por $${value}.`);
}

/* =========================================================
   WAVES
========================================================= */
function jtdStartWave(){
  if (!JTD_GAME.active || JTD_GAME.waveInProgress || JTD_GAME.paused) return;
  if (JTD_GAME.currentWave >= JTD_GAME.totalWaves) return;

  JTD_GAME.currentWave += 1;
  const waveCfg = JTD_GAME.waveConfig[JTD_GAME.currentWave - 1];

  // achata os grupos da wave em uma fila de spawn sequencial (amount + delay)
  const queue = [];
  let cursor = 0;
  waveCfg.enemies.forEach(group => {
    for (let i = 0; i < group.amount; i++){
      queue.push({ type: group.type, atMs: cursor });
      cursor += group.delay;
    }
  });

  JTD_GAME.spawnQueue = queue;
  JTD_GAME.spawnClockMs = 0;
  JTD_GAME.waveInProgress = true;

  document.getElementById("wave-info-number").textContent = JTD_GAME.currentWave;
  document.getElementById("wave-info-desc").textContent = "Wave em andamento...";
  document.getElementById("btn-start-wave").disabled = true;
  jtdUpdateBattleHud();
}

/* =========================================================
   GAME LOOP (requestAnimationFrame)
========================================================= */
function jtdGameLoop(timestampMs){
  if (!JTD_GAME.active) return;

  const rawDeltaMs = JTD_GAME.lastFrameTime != null ? timestampMs - JTD_GAME.lastFrameTime : 16.6;
  JTD_GAME.lastFrameTime = timestampMs;
  const deltaMs = Math.min(rawDeltaMs, 50) * JTD_GAME.speedMultiplier; // clamp evita saltos ao trocar de aba

  if (!JTD_GAME.paused){
    jtdUpdateBattleLogic(deltaMs, deltaMs / 1000);
  }
  jtdRenderBattleFrame();

  if (JTD_GAME.active){
    JTD_GAME.rafHandle = requestAnimationFrame(jtdGameLoop);
  }
}

function jtdUpdateBattleLogic(deltaMs, deltaSeconds){
  JTD_GAME.elapsedSeconds += deltaSeconds;

  jtdProcessSpawnQueue(deltaMs);
  jtdUpdateEnemies(deltaSeconds);
  jtdUpdateTowerAttacks();
  jtdUpdateProjectiles(deltaSeconds);
  jtdCleanupDeadEntities();
  jtdCheckWaveCompletion();

  if (JTD_GAME.hp <= 0 && JTD_GAME.active){
    jtdEndBattle(false);
    return;
  }
  jtdUpdateBattleHud();
}

function jtdProcessSpawnQueue(deltaMs){
  if (!JTD_GAME.waveInProgress) return;
  JTD_GAME.spawnClockMs += deltaMs;
  while (JTD_GAME.spawnQueue.length && JTD_GAME.spawnQueue[0].atMs <= JTD_GAME.spawnClockMs){
    const next = JTD_GAME.spawnQueue.shift();
    JTD_GAME.enemies.push(jtdCreateEnemy(next.type, JTD_GAME.map.path));
  }
}

function jtdUpdateEnemies(deltaSeconds){
  for (const enemy of JTD_GAME.enemies){
    if (!enemy.alive) continue;
    const reachedBase = jtdUpdateEnemy(enemy, deltaSeconds, JTD_GAME.map.path);
    if (reachedBase){
      JTD_GAME.hp = Math.max(0, JTD_GAME.hp - enemy.baseDamage);
    }
  }
}

function jtdUpdateTowerAttacks(){
  const nowMs = JTD_GAME.elapsedSeconds * 1000;
  for (const tower of JTD_GAME.towers){
    const target = jtdFindTowerTarget(tower, JTD_GAME.enemies);
    if (target && jtdTowerCanAttack(tower, nowMs)){
      tower.lastAttackTime = nowMs;
      const type = jtdGetTowerType(tower.typeId);
      JTD_GAME.projectiles.push(jtdCreateProjectile(tower, target, type.projectileSpeed, type.projectileColor));
    }
  }
}

function jtdUpdateProjectiles(deltaSeconds){
  const enemiesById = new Map(JTD_GAME.enemies.map(e => [e.id, e]));
  for (const proj of JTD_GAME.projectiles){
    if (!proj.alive) continue;
    const result = jtdUpdateProjectile(proj, deltaSeconds, enemiesById);
    if (result !== "hit") continue;

    const target = enemiesById.get(proj.targetId);
    if (!target || !target.alive) continue;

    const died = jtdDamageEnemy(target, proj.damage);
    JTD_GAME.stats.damageDealt += proj.damage;
    if (died){
      JTD_GAME.stats.enemiesDefeated += 1;
      JTD_GAME.money += target.reward;
    }
  }
}

function jtdCleanupDeadEntities(){
  JTD_GAME.enemies = JTD_GAME.enemies.filter(e => e.alive);
  JTD_GAME.projectiles = JTD_GAME.projectiles.filter(p => p.alive);
}

function jtdCheckWaveCompletion(){
  if (!JTD_GAME.waveInProgress) return;
  if (JTD_GAME.spawnQueue.length > 0 || JTD_GAME.enemies.length > 0) return;

  JTD_GAME.waveInProgress = false;

  if (JTD_GAME.currentWave >= JTD_GAME.totalWaves){
    jtdEndBattle(true);
    return;
  }
  document.getElementById("btn-start-wave").disabled = false;
  document.getElementById("wave-info-desc").textContent = "Wave concluída. Pressione START WAVE para continuar.";
}

/* =========================================================
   HUD
========================================================= */
function jtdUpdateBattleHud(){
  document.getElementById("battle-hp").textContent = JTD_GAME.hp;
  document.getElementById("battle-wave").textContent = `${JTD_GAME.currentWave} / ${JTD_GAME.totalWaves}`;
  document.getElementById("battle-money").textContent = JTD_GAME.money;
  document.getElementById("battle-time").textContent = jtdFormatTime(Math.floor(JTD_GAME.elapsedSeconds));
}

/* =========================================================
   RENDERIZAÇÃO (canvas)
========================================================= */
function jtdRenderBattleFrame(){
  const { ctx, canvasCssWidth: w, canvasCssHeight: h, map } = JTD_GAME;
  if (!ctx || !map || !w) return;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0D1119";
  ctx.fillRect(0, 0, w, h);

  jtdDrawPath(ctx, map);
  jtdDrawSpawnAndBase(ctx, map);
  jtdDrawTowerSpots(ctx, map);

  JTD_GAME.towers.forEach(tower => {
    const s = jtdMapToScreen({ x: tower.x, y: tower.y });
    jtdDrawTower(ctx, s, 16 * JTD_GAME.scale, tower.range * JTD_GAME.scale, tower);
  });

  JTD_GAME.enemies.forEach(enemy => {
    const s = jtdMapToScreen({ x: enemy.x, y: enemy.y });
    jtdDrawEnemy(ctx, s, enemy.radius * JTD_GAME.scale, enemy);
  });

  JTD_GAME.projectiles.forEach(proj => {
    const s = jtdMapToScreen({ x: proj.x, y: proj.y });
    jtdDrawProjectile(ctx, s, proj);
  });

  if (JTD_GAME.placement && JTD_GAME.placement.x != null){
    const type = jtdGetTowerType(JTD_GAME.placement.typeId);
    const levelStats = type.levels[0];
    const s = jtdMapToScreen({ x: JTD_GAME.placement.x, y: JTD_GAME.placement.y });
    jtdDrawTowerGhost(ctx, s, 16 * JTD_GAME.scale, levelStats.range * JTD_GAME.scale, JTD_GAME.placement.valid);
  }
}

function jtdDrawPath(ctx, map){
  ctx.beginPath();
  map.path.forEach((pt, i) => {
    const s = jtdMapToScreen(pt);
    if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
  });
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.strokeStyle = "#1B2333";
  ctx.lineWidth = 50 * JTD_GAME.scale;
  ctx.stroke();

  ctx.strokeStyle = "rgba(76,111,165,.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function jtdDrawSpawnAndBase(ctx, map){
  const spawnS = jtdMapToScreen(map.spawn);
  const baseS = jtdMapToScreen(map.base);

  ctx.beginPath();
  ctx.arc(spawnS.x, spawnS.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#4FBE8C";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(baseS.x, baseS.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#E5555A";
  ctx.fill();
}

function jtdDrawTowerSpots(ctx, map){
  map.towerSpots.forEach(spot => {
    const s = jtdMapToScreen(spot);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 20 * JTD_GAME.scale, 0, Math.PI * 2);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(108,120,145,.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

/* =========================================================
   PAUSE
========================================================= */
function jtdTogglePause(){
  if (!JTD_GAME.active) return;
  JTD_GAME.paused = !JTD_GAME.paused;
  document.getElementById("pause-overlay").hidden = !JTD_GAME.paused;
}
function jtdResumeBattle(){
  JTD_GAME.paused = false;
  document.getElementById("pause-overlay").hidden = true;
}

/* =========================================================
   VELOCIDADE (estrutura pronta, ainda só 1x)
========================================================= */
function jtdCycleSpeed(){
  jtdShowToast("Velocidades adicionais (2x/3x) chegam em uma próxima versão.");
}

/* =========================================================
   SAIR DA BATALHA (com confirmação)
========================================================= */
function jtdExitBattle(){
  if (!JTD_GAME.active) { jtdShowScreen("worlds"); return; }
  document.getElementById("exit-confirm-overlay").hidden = false;
}
function jtdCancelExitBattle(){
  document.getElementById("exit-confirm-overlay").hidden = true;
}
function jtdAbandonBattle(){
  JTD_GAME.active = false;
  cancelAnimationFrame(JTD_GAME.rafHandle);
  document.getElementById("exit-confirm-overlay").hidden = true;
  jtdShowScreen("worlds");
}

/* =========================================================
   FIM DE PARTIDA — liga o combate real ao sistema existente
   de XP / economia / estatísticas (state.js) e à tela de
   resultado existente (ui.js). Nada aqui é sorteado: os
   números vêm inteiramente do que aconteceu na batalha.
========================================================= */
function jtdEndBattle(victory){
  if (!JTD_GAME.active) return;
  JTD_GAME.active = false;
  cancelAnimationFrame(JTD_GAME.rafHandle);

  const stage = jtdFindStage(JTD_GAME.stageId).stage;
  const coinsGained = victory ? stage.coins : Math.floor(stage.coins * 0.25);
  const xpGained = victory ? stage.xp : Math.floor(stage.xp * 0.2);
  const timeSeconds = Math.floor(JTD_GAME.elapsedSeconds);
  const damageDealt = Math.floor(JTD_GAME.stats.damageDealt);

  jtdRegisterStageResult({
    stageId: JTD_GAME.stageId,
    victory,
    wave: JTD_GAME.currentWave,
    timeSeconds,
    enemiesDefeated: JTD_GAME.stats.enemiesDefeated,
    damageDealt,
  });

  jtdAddCoins(coinsGained);
  const xpResult = jtdAddXp(xpGained);

  jtdRenderResult({
    victory,
    wave: JTD_GAME.currentWave,
    xpResult,
    coinsGained,
    enemiesDefeated: JTD_GAME.stats.enemiesDefeated,
    damageDealt,
    timeSeconds,
  });
}
