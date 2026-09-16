/**
 * JAB TOWER DEFENSE — BATTLE / ENEMY
 * -----------------------------------------------------------------------
 * Entidade de inimigo em tempo de execução. Os DADOS de cada tipo de
 * inimigo (hp, velocidade, recompensa...) vêm de `JTD_DATA.enemyTypes`
 * (data.js) — este arquivo só cuida do COMPORTAMENTO em batalha:
 * nascer, seguir o caminho, tomar dano, morrer, e ser desenhado.
 * -----------------------------------------------------------------------
 */

let __jtdEnemySeq = 0;

/**
 * Cria uma instância de inimigo em tempo de execução a partir de um
 * tipo definido em JTD_DATA.enemyTypes. `path` é o array de pontos
 * (espaço virtual do mapa) que o inimigo vai seguir.
 */
function jtdCreateEnemy(typeId, path){
  const type = jtdGetEnemyType(typeId);
  if (!type) throw new Error(`JTD: tipo de inimigo desconhecido: ${typeId}`);

  const start = path[0];
  return {
    id: `enemy-${++__jtdEnemySeq}`,
    typeId,
    name: type.name,
    hp: type.hp,
    maxHp: type.hp,
    speed: type.speed,
    reward: type.reward,
    baseDamage: type.baseDamage,
    radius: type.radius,
    color: type.color,
    isBoss: type.isBoss,
    x: start.x,
    y: start.y,
    pathIndex: 0,     // índice do PRÓXIMO ponto do caminho a alcançar
    alive: true,
    reachedBase: false,
    distanceTraveled: 0, // usado pelas torres para o modo de alvo FIRST/LAST
  };
}

/**
 * Move o inimigo ao longo do `path` de acordo com o tempo decorrido
 * (`dtSeconds`). Retorna true se o inimigo alcançou a base neste tick.
 */
function jtdUpdateEnemy(enemy, dtSeconds, path){
  if (!enemy.alive) return false;

  let remaining = enemy.speed * dtSeconds;

  while (remaining > 0 && enemy.pathIndex < path.length - 1){
    const target = path[enemy.pathIndex + 1];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= remaining){
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.pathIndex += 1;
      enemy.distanceTraveled += dist;
      remaining -= dist;
    } else {
      const ratio = remaining / dist;
      enemy.x += dx * ratio;
      enemy.y += dy * ratio;
      enemy.distanceTraveled += remaining;
      remaining = 0;
    }
  }

  if (enemy.pathIndex >= path.length - 1){
    enemy.alive = false;
    enemy.reachedBase = true;
    return true;
  }
  return false;
}

/** Aplica dano ao inimigo. Retorna true se ele morreu com este dano. */
function jtdDamageEnemy(enemy, amount){
  enemy.hp -= amount;
  if (enemy.hp <= 0 && enemy.alive){
    enemy.hp = 0;
    enemy.alive = false;
    return true;
  }
  return false;
}

/** Desenha o inimigo (corpo + barra de HP) no canvas, em coordenadas já convertidas para tela. */
function jtdDrawEnemy(ctx, screenPos, radiusPx, enemy){
  ctx.save();

  // corpo
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radiusPx, 0, Math.PI * 2);
  ctx.fillStyle = enemy.color;
  ctx.fill();
  ctx.lineWidth = enemy.isBoss ? 3 : 1.5;
  ctx.strokeStyle = enemy.isBoss ? "#F2A93B" : "rgba(0,0,0,.35)";
  ctx.stroke();

  // barra de HP
  const barWidth = radiusPx * 2.4;
  const barHeight = 4;
  const barX = screenPos.x - barWidth / 2;
  const barY = screenPos.y - radiusPx - 10;
  const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

  ctx.fillStyle = "rgba(10,13,20,.75)";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = hpRatio > 0.5 ? "#4FBE8C" : hpRatio > 0.2 ? "#F2A93B" : "#E5555A";
  ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

  ctx.restore();
}
