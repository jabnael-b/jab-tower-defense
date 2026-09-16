/**
 * JAB TOWER DEFENSE — DATA
 * -----------------------------------------------------------------------
 * Este arquivo concentra toda a "configuração" do jogo: catálogos,
 * placeholders e tabelas de balanceamento. A ideia é que, quando você
 * for adicionar personagens, mapas e fases de verdade, baste editar
 * (ou substituir) os objetos deste arquivo — nada na lógica de UI
 * ou de estado (state.js / ui.js) precisa mudar.
 *
 * NADA aqui é definitivo: nomes, mapas e unidades são placeholders.
 * -----------------------------------------------------------------------
 */

const JTD_DATA = {};

/* =========================================================
   1. CLASSIFICAÇÃO DO JOGADOR (título por nível)
   Sistema próprio do JTD — inspirado na progressão "por título"
   de Tower Defense Simulator, sem copiar os nomes ou valores.
   `minLevel` define a partir de que nível o título é alcançado.
========================================================= */
JTD_DATA.playerRanks = [
  { id: "recruta",    name: "RECRUTA",    minLevel: 1,  color: "#8C97AC" },
  { id: "guardiao",   name: "GUARDIÃO",   minLevel: 10, color: "#57C48A" },
  { id: "comandante", name: "COMANDANTE", minLevel: 25, color: "#4C9BE8" },
  { id: "mestre",     name: "MESTRE",     minLevel: 45, color: "#B36BF0" },
  { id: "lendario",   name: "LENDÁRIO",   minLevel: 70, color: "#F2A93B" },
];

/* =========================================================
   2. RARIDADE DE UNIDADES — sistema de estrelas
   Inspirado na sensação do All Star Tower Defense, mas com
   nomes, cores e quantidade de tiers próprios do JTD.
   Isso é usado para as UNIDADES (torres), não para o jogador.
========================================================= */
JTD_DATA.unitRarities = [
  { stars: 1, id: "comum",    name: "COMUM",    color: "var(--star-1)" },
  { stars: 2, id: "incomum",  name: "INCOMUM",  color: "var(--star-2)" },
  { stars: 3, id: "raro",     name: "RARO",     color: "var(--star-3)" },
  { stars: 4, id: "epico",    name: "ÉPICO",    color: "var(--star-4)" },
  { stars: 5, id: "lendario", name: "LENDÁRIO", color: "var(--star-5)" },
  { stars: 6, id: "mitico",   name: "MÍTICO",   color: "var(--star-6)" },
];

/* =========================================================
   3. DIFICULDADES DE FASE
   Inspirado em Tower Defense Simulator (Easy/Medium/Hard),
   com um tier extra próprio do JTD: JABPESADELO.
========================================================= */
JTD_DATA.difficulties = [
  { id: "easy",        name: "EASY",        cssClass: "diff-easy" },
  { id: "medium",      name: "MEDIUM",      cssClass: "diff-medium" },
  { id: "hard",        name: "HARD",        cssClass: "diff-hard" },
  { id: "jabpesadelo", name: "JABPESADELO", cssClass: "diff-jabpesadelo" },
];

function jtdGetDifficulty(id){
  return JTD_DATA.difficulties.find(d => d.id === id) || JTD_DATA.difficulties[0];
}

/* =========================================================
   4. MUNDOS E FASES (placeholders)
   Apenas para testar a interface. Nomes e recompensas fictícios.
========================================================= */
JTD_DATA.worlds = [
  {
    id: "world-1",
    name: "WORLD 1",
    subtitle: "Primeiros Passos",
    stages: [
      { id: "w1-s1", index: 1, name: "???", difficulty: "easy",   xp: 100, coins: 250, waves: 10, mapId: "map-test-01", unlocked: true },
      { id: "w1-s2", index: 2, name: "???", difficulty: "easy",   xp: 120, coins: 280, waves: 10, mapId: "map-test-01", unlocked: false },
      { id: "w1-s3", index: 3, name: "???", difficulty: "medium", xp: 150, coins: 320, waves: 12, mapId: "map-test-01", unlocked: false },
    ],
  },
  {
    id: "world-2",
    name: "WORLD 2",
    subtitle: "Território Hostil",
    stages: [
      { id: "w2-s1", index: 1, name: "???", difficulty: "medium",      xp: 180, coins: 360, waves: 14, mapId: "map-test-01", unlocked: false },
      { id: "w2-s2", index: 2, name: "???", difficulty: "hard",        xp: 220, coins: 420, waves: 16, mapId: "map-test-01", unlocked: false },
      { id: "w2-s3", index: 3, name: "???", difficulty: "jabpesadelo", xp: 300, coins: 600, waves: 20, mapId: "map-test-01", unlocked: false },
    ],
  },
];

function jtdFindStage(stageId){
  for (const world of JTD_DATA.worlds){
    const stage = world.stages.find(s => s.id === stageId);
    if (stage) return { world, stage };
  }
  return null;
}

/* =========================================================
   5. MISSÕES (placeholders, estrutura reutilizável)
   `progressKey` aponta para uma estatística do player.statistics
   usada para calcular o progresso automaticamente.
========================================================= */
JTD_DATA.missionTemplates = [
  { id: "m-complete-1-stage", title: "Complete 1 fase",        progressKey: "stagesCompleted", target: 1,   rewardXp: 50,  rewardCoins: 100 },
  { id: "m-reach-wave-10",    title: "Alcance a Wave 10",       progressKey: "highestWave",     target: 10,  rewardXp: 80,  rewardCoins: 150 },
  { id: "m-defeat-100",       title: "Derrote 100 inimigos",    progressKey: "enemiesDefeated", target: 100, rewardXp: 120, rewardCoins: 200 },
  { id: "m-win-3",            title: "Vença 3 partidas",        progressKey: "wins",            target: 3,   rewardXp: 90,  rewardCoins: 180 },
];

/* =========================================================
   6. RANKING (jogadores fictícios, apenas demonstração)
========================================================= */
JTD_DATA.mockRankingPlayers = [
  { name: "PlayerOne",   level: 87, wins: 340, highestWave: 61, damage: 1520000 },
  { name: "PlayerTwo",   level: 76, wins: 298, highestWave: 54, damage: 1180000 },
  { name: "ShadowFox",   level: 69, wins: 271, highestWave: 49, damage: 990000 },
  { name: "NovaStrike",  level: 63, wins: 240, highestWave: 45, damage: 860000 },
  { name: "IronRecruit", level: 58, wins: 205, highestWave: 40, damage: 730000 },
  { name: "VoidRunner",  level: 52, wins: 188, highestWave: 36, damage: 610000 },
];

/* =========================================================
   7. CONFIGURAÇÕES (placeholders de UI)
========================================================= */
JTD_DATA.settingsSchema = [
  { group: "Áudio", items: [
    { id: "volumeMaster", label: "Volume geral", type: "slider", min: 0, max: 100, default: 80 },
    { id: "musicOn",      label: "Música",        type: "toggle", default: true },
    { id: "sfxOn",        label: "Efeitos sonoros", type: "toggle", default: true },
  ]},
  { group: "Exibição", items: [
    { id: "quality",    label: "Qualidade gráfica", type: "select", options: ["Baixa", "Média", "Alta"], default: "Média" },
    { id: "showFps",    label: "Mostrar FPS",        type: "toggle", default: false },
    { id: "fullscreen", label: "Modo tela cheia",     type: "toggle", default: false },
  ]},
];

/* =========================================================
   8. MAPAS (BATTLE ENGINE)
   -----------------------------------------------------------
   Cada mapa é descrito em um espaço de coordenadas "virtual"
   fixo (`width` x `height`), independente do tamanho real do
   canvas na tela. O motor de batalha (js/battle/battle-engine.js)
   escala essas coordenadas para o canvas atual, então o mesmo
   mapa funciona em qualquer resolução.

   `path`        → pontos que os inimigos seguem, do spawn até a base.
   `spawn`/`base` → extremos do path (mantidos separados por clareza).
   `towerSpots`   → zonas sugeridas de construção, apenas visuais
                     (marcadas no mapa). A colocação de torres não
                     fica restrita a elas: qualquer ponto válido do
                     mapa (fora do caminho, dentro dos limites, sem
                     sobrepor outra torre) pode receber uma torre.
   Ainda é um mapa 100% placeholder — "Campo de Teste".
========================================================= */
JTD_DATA.maps = [
  {
    id: "map-test-01",
    name: "Campo de Teste",
    width: 1000,
    height: 560,
    path: [
      { x: 0,    y: 280 },
      { x: 260,  y: 280 },
      { x: 260,  y: 90  },
      { x: 560,  y: 90  },
      { x: 560,  y: 470 },
      { x: 810,  y: 470 },
      { x: 810,  y: 280 },
      { x: 1000, y: 280 },
    ],
    spawn: { x: 0, y: 280 },
    base: { x: 1000, y: 280 },
    towerSpots: [
      { x: 130, y: 160 }, { x: 130, y: 400 },
      { x: 410, y: 200 }, { x: 410, y: 470 },
      { x: 680, y: 160 }, { x: 680, y: 400 },
      { x: 900, y: 160 }, { x: 900, y: 400 },
    ],
  },
];

function jtdGetMap(mapId){
  return JTD_DATA.maps.find(m => m.id === mapId) || JTD_DATA.maps[0];
}

/* =========================================================
   9. TIPOS DE INIMIGO (BATTLE ENGINE)
   -----------------------------------------------------------
   Entidades técnicas temporárias, como pedido: "Test Enemy" e
   "Test Boss". Quando os inimigos definitivos forem criados,
   basta acrescentar novas entradas neste objeto — nada no motor
   de batalha (js/battle/enemy.js) precisa ser alterado, pois ele
   sempre lê os valores a partir daqui.
========================================================= */
JTD_DATA.enemyTypes = {
  "test-enemy": {
    id: "test-enemy",
    name: "Test Enemy",
    hp: 100,
    speed: 70,        // unidades de mapa por segundo
    reward: 15,        // coins ao morrer
    baseDamage: 5,      // dano à base se chegar ao fim do caminho
    radius: 12,
    color: "#E5555A",
    isBoss: false,
  },
  "test-boss": {
    id: "test-boss",
    name: "Test Boss",
    hp: 2200,
    speed: 34,
    reward: 400,
    baseDamage: 25,
    radius: 22,
    color: "#B23CE0",
    isBoss: true,
  },
};

function jtdGetEnemyType(typeId){
  return JTD_DATA.enemyTypes[typeId];
}

/* =========================================================
   10. TIPOS DE TORRE (BATTLE ENGINE)
   -----------------------------------------------------------
   Só existe "Test Tower" por enquanto. `levels` guarda o
   balanceamento de cada nível de upgrade — dano, alcance,
   velocidade de ataque e custo do PRÓXIMO upgrade (o custo do
   nível 1 é o preço de compra em `cost`).
========================================================= */
JTD_DATA.towerTypes = {
  "test-tower": {
    id: "test-tower",
    name: "TEST TOWER",
    cost: 250,
    sellMultiplier: 0.7,      // % do total investido devolvido ao vender
    projectileSpeed: 520,      // unidades de mapa por segundo
    projectileColor: "#F2A93B",
    defaultTargetMode: "FIRST",
    levels: [
      { level: 1, damage: 20, range: 150, attackSpeed: 1.0,  upgradeCost: 180 },
      { level: 2, damage: 35, range: 165, attackSpeed: 1.15, upgradeCost: 260 },
      { level: 3, damage: 55, range: 180, attackSpeed: 1.3,  upgradeCost: null },
    ],
  },
};

function jtdGetTowerType(typeId){
  return JTD_DATA.towerTypes[typeId];
}

/* =========================================================
   11. GERAÇÃO DE WAVES (BATTLE ENGINE)
   -----------------------------------------------------------
   Formato de cada wave (conforme pedido):
     { wave: N, enemies: [ { type, amount, delay } ] }
   Em vez de escrever essa lista à mão para cada fase, geramos a
   partir do número de waves já definido em cada `stage.waves` —
   assim a config continua vivendo em data.js (não em game.js),
   só que de forma compacta. Quando você quiser desenhar uma wave
   manualmente (com tipos de inimigo variados, múltiplos grupos,
   etc.), pode simplesmente escrever o array e usá-lo no lugar do
   resultado desta função — o motor de batalha aceita qualquer
   array nesse formato, gerado ou escrito à mão.
========================================================= */
function jtdGenerateWaveConfig(totalWaves){
  const waves = [];
  for (let w = 1; w <= totalWaves; w++){
    const isFinalWave = w === totalWaves;

    if (isFinalWave){
      waves.push({
        wave: w,
        enemies: [
          { type: "test-enemy", amount: 6 + w, delay: 550 },
          { type: "test-boss",  amount: 1,      delay: 1400 },
        ],
      });
    } else {
      const amount = 4 + Math.floor(w * 1.6);
      const delay = Math.max(320, 800 - w * 18);
      waves.push({ wave: w, enemies: [ { type: "test-enemy", amount, delay } ] });
    }
  }
  return waves;
}
