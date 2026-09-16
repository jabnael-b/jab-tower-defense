/**
 * JAB TOWER DEFENSE — BATTLE / PROJECTILE
 * -----------------------------------------------------------------------
 * Projétil simples que persegue um inimigo específico até acertá-lo
 * (ou até o alvo morrer/sumir antes de ser atingido). Efeito visual
 * mínimo — pronto para ser substituído por sprites/efeitos reais depois.
 * -----------------------------------------------------------------------
 */

let __jtdProjectileSeq = 0;

/** Cria um projétil disparado por uma torre em direção a um inimigo. */
function jtdCreateProjectile(tower, targetEnemy, speed, color){
  return {
    id: `proj-${++__jtdProjectileSeq}`,
    x: tower.x,
    y: tower.y,
    targetId: targetEnemy.id,
    speed,
    damage: tower.damage,
    color: color || "#F2A93B",
    alive: true,
  };
}

/**
 * Move o projétil em direção ao inimigo-alvo. `enemiesById` é um Map
 * (ou objeto) de inimigos vivos por id, usado para localizar o alvo
 * atual. Retorna "hit" | "miss" | "flying".
 *   hit   → colidiu com o alvo neste tick (dano ainda não aplicado aqui)
 *   miss  → o alvo já não existe/está morto; o projétil deve ser descartado
 *   flying→ continua em voo
 */
function jtdUpdateProjectile(proj, dtSeconds, enemiesById){
  const target = enemiesById.get(proj.targetId);
  if (!target || !target.alive){
    proj.alive = false;
    return "miss";
  }

  const dx = target.x - proj.x;
  const dy = target.y - proj.y;
  const dist = Math.hypot(dx, dy);
  const step = proj.speed * dtSeconds;

  if (dist <= step){
    proj.x = target.x;
    proj.y = target.y;
    proj.alive = false;
    return "hit";
  }

  proj.x += (dx / dist) * step;
  proj.y += (dy / dist) * step;
  return "flying";
}

/** Desenha o projétil (ponto brilhante) no canvas, em coordenadas de tela. */
function jtdDrawProjectile(ctx, screenPos, proj){
  ctx.save();
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = proj.color;
  ctx.shadowColor = proj.color;
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.restore();
}
