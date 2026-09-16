/**
 * JAB TOWER DEFENSE — BATTLE / TOWER
 * -----------------------------------------------------------------------
 * Entidade de torre em tempo de execução. Os DADOS de cada tipo de
 * torre (dano, alcance, custo por nível...) vêm de `JTD_DATA.towerTypes`
 * (data.js) — este arquivo cuida do COMPORTAMENTO: mirar, decidir
 * quando atacar, subir de nível, ser vendida, e ser desenhada.
 * -----------------------------------------------------------------------
 */

let __jtdTowerSeq = 0;

const JTD_TARGET_MODES = ["FIRST", "LAST", "STRONGEST", "WEAKEST"];

/** Cria uma torre no nível 1 em uma posição do mapa (espaço virtual). */
function jtdCreateTower(typeId, x, y){
  const type = jtdGetTowerType(typeId);
  if (!type) throw new Error(`JTD: tipo de torre desconhecido: ${typeId}`);

  const levelStats = type.levels[0];
  return {
    id: `tower-${++__jtdTowerSeq}`,
    typeId,
    name: type.name,
    x, y,
    level: 1,
    damage: levelStats.damage,
    range: levelStats.range,
    attackSpeed: levelStats.attackSpeed, // ataques por segundo
    targetMode: type.defaultTargetMode || "FIRST",
    targetId: null,
    lastAttackTime: 0,
    totalInvested: type.cost,  // usado para calcular o valor de venda
    selected: false,
  };
}

/** Retorna as estatísticas do nível ATUAL da torre (para exibir no painel). */
function jtdGetTowerLevelInfo(tower){
  const type = jtdGetTowerType(tower.typeId);
  return type.levels[tower.level - 1];
}

/** Retorna as estatísticas do PRÓXIMO nível, ou null se já for o nível máximo. */
function jtdGetTowerNextLevelInfo(tower){
  const type = jtdGetTowerType(tower.typeId);
  return type.levels[tower.level] || null;
}

/**
 * Aplica o próximo nível à torre (estatísticas apenas — quem decide se
 * o jogador PODE pagar e quem desconta o dinheiro em batalha é
 * `jtdUpgradeSelectedTower()` em game.js, para manter a economia da
 * partida em um único lugar). Retorna o custo do upgrade aplicado, ou
 * null se não havia próximo nível.
 */
function jtdUpgradeTower(tower){
  const current = jtdGetTowerLevelInfo(tower);
  const next = jtdGetTowerNextLevelInfo(tower);
  if (!next || current.upgradeCost == null) return null;

  tower.totalInvested += current.upgradeCost;
  tower.level += 1;
  tower.damage = next.damage;
  tower.range = next.range;
  tower.attackSpeed = next.attackSpeed;
  return current.upgradeCost;
}

/** Valor de venda da torre: percentual configurável sobre o total investido. */
function jtdGetTowerSellValue(tower){
  const type = jtdGetTowerType(tower.typeId);
  return Math.round(tower.totalInvested * type.sellMultiplier);
}

/**
 * Escolhe um alvo entre os inimigos vivos dentro do alcance, de acordo
 * com o `targetMode` da torre. `enemies` é a lista completa da wave —
 * a função filtra por distância internamente.
 */
function jtdFindTowerTarget(tower, enemies){
  const inRange = enemies.filter(e => e.alive && Math.hypot(e.x - tower.x, e.y - tower.y) <= tower.range);
  if (inRange.length === 0) return null;

  switch (tower.targetMode){
    case "LAST":
      return inRange.reduce((a, b) => (a.distanceTraveled < b.distanceTraveled ? a : b));
    case "STRONGEST":
      return inRange.reduce((a, b) => (a.hp > b.hp ? a : b));
    case "WEAKEST":
      return inRange.reduce((a, b) => (a.hp < b.hp ? a : b));
    case "FIRST":
    default:
      return inRange.reduce((a, b) => (a.distanceTraveled > b.distanceTraveled ? a : b));
  }
}

/** A torre pode atacar novamente? `nowMs` é o relógio da partida (respeita pause/velocidade). */
function jtdTowerCanAttack(tower, nowMs){
  const cooldownMs = 1000 / tower.attackSpeed;
  return nowMs - tower.lastAttackTime >= cooldownMs;
}

/** Desenha a torre (base + alcance quando selecionada) no canvas. */
function jtdDrawTower(ctx, screenPos, radiusPx, rangePx, tower){
  ctx.save();

  if (tower.selected){
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, rangePx, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(76,111,165,.10)";
    ctx.fill();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "rgba(76,111,165,.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // base (quadrado tecnológico com o nível marcado)
  const half = radiusPx;
  ctx.beginPath();
  ctx.moveTo(screenPos.x, screenPos.y - half);
  ctx.lineTo(screenPos.x + half, screenPos.y);
  ctx.lineTo(screenPos.x, screenPos.y + half);
  ctx.lineTo(screenPos.x - half, screenPos.y);
  ctx.closePath();
  ctx.fillStyle = "#1B2333";
  ctx.fill();
  ctx.lineWidth = tower.selected ? 2.5 : 1.5;
  ctx.strokeStyle = tower.selected ? "#F2A93B" : "#4C6FA5";
  ctx.stroke();

  ctx.fillStyle = "#EDF1F7";
  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(tower.level), screenPos.x, screenPos.y + 1);

  ctx.restore();
}

/** Desenha o "ghost" de posicionamento (torre semi-transparente + círculo de alcance). */
function jtdDrawTowerGhost(ctx, screenPos, radiusPx, rangePx, valid){
  ctx.save();
  const color = valid ? "#4FBE8C" : "#E5555A";

  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, rangePx, 0, Math.PI * 2);
  ctx.fillStyle = valid ? "rgba(79,190,140,.10)" : "rgba(229,85,90,.10)";
  ctx.fill();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radiusPx, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
