/**
 * JAB TOWER DEFENSE — MAIN
 * -----------------------------------------------------------------------
 * Ponto de entrada: roda a tela de loading, liga os eventos de todos os
 * botões (usando data-nav para navegação genérica) e inicia o jogo.
 * -----------------------------------------------------------------------
 */

const JTD_LOADING_MESSAGES = [
  "Preparando defesa...",
  "Carregando mundo...",
  "Organizando tropas...",
  "Preparando batalha...",
];

function jtdRunLoadingSequence(){
  const fill = document.getElementById("loading-bar-fill");
  const percentEl = document.getElementById("loading-percent");
  const messageEl = document.getElementById("loading-message");
  const bar = document.getElementById("loading-progressbar");

  let progress = 0;
  let msgIndex = 0;
  messageEl.textContent = JTD_LOADING_MESSAGES[0];

  const interval = setInterval(() => {
    progress += Math.random() * 14 + 6;
    if (progress >= 100){
      progress = 100;
      clearInterval(interval);
      setTimeout(() => jtdShowScreen("menu"), 260);
    }
    fill.style.width = `${progress}%`;
    bar.setAttribute("aria-valuenow", Math.round(progress));
    percentEl.textContent = `${Math.round(progress)}%`;

    const newMsgIndex = Math.min(
      JTD_LOADING_MESSAGES.length - 1,
      Math.floor((progress / 100) * JTD_LOADING_MESSAGES.length)
    );
    if (newMsgIndex !== msgIndex){
      msgIndex = newMsgIndex;
      messageEl.textContent = JTD_LOADING_MESSAGES[msgIndex];
    }
  }, 220);
}

/* =========================================================
   NAVEGAÇÃO GENÉRICA (data-nav="menu" | "profile" | ...)
========================================================= */
function jtdBindGenericNav(){
  document.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", () => jtdShowScreen(el.dataset.nav));
  });
}

/* =========================================================
   BOTÕES ESPECÍFICOS DE FLUXO
========================================================= */
function jtdBindFlowButtons(){
  document.getElementById("btn-goto-lobby").addEventListener("click", () => {
    jtdRenderLobby();
    jtdShowScreen("lobby");
  });

  document.getElementById("btn-start-battle").addEventListener("click", () => {
    jtdStartBattle(JTD_UI.currentStageId);
  });

  document.getElementById("btn-start-wave").addEventListener("click", jtdStartWave);
  document.getElementById("btn-battle-exit").addEventListener("click", jtdExitBattle);
  document.getElementById("btn-battle-pause").addEventListener("click", jtdTogglePause);
  document.getElementById("btn-battle-speed").addEventListener("click", jtdCycleSpeed);

  document.getElementById("unit-panel-close").addEventListener("click", jtdCloseUnitPanel);
  document.getElementById("unit-panel-sell").addEventListener("click", jtdSellSelectedTower);
  document.getElementById("unit-panel-upgrade").addEventListener("click", jtdUpgradeSelectedTower);

  document.getElementById("btn-pause-resume").addEventListener("click", jtdResumeBattle);
  document.getElementById("btn-pause-exit").addEventListener("click", () => {
    jtdResumeBattle();
    jtdExitBattle();
  });

  document.getElementById("btn-exit-cancel").addEventListener("click", jtdCancelExitBattle);
  document.getElementById("btn-exit-confirm").addEventListener("click", jtdAbandonBattle);

  document.getElementById("btn-play-again").addEventListener("click", () => {
    jtdStartBattle(JTD_UI.currentStageId);
  });
  document.getElementById("btn-result-worldmap").addEventListener("click", () => jtdShowScreen("worlds"));
  document.getElementById("btn-result-menu").addEventListener("click", () => jtdShowScreen("menu"));

  document.getElementById("btn-reset-game").addEventListener("click", () => {
    const confirmed = window.confirm("Isso vai apagar todo o progresso salvo. Deseja continuar?");
    if (!confirmed) return;
    jtdResetGame();
    jtdShowToast("Progresso reiniciado.");
    jtdShowScreen("menu");
  });
}

/* =========================================================
   TABS (ranking / inventário)
========================================================= */
function jtdBindTabs(){
  document.getElementById("ranking-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll("#ranking-tabs .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    JTD_UI.rankingTab = btn.dataset.tab;
    jtdRenderRanking();
  });

  document.getElementById("inventory-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll("#inventory-tabs .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    JTD_UI.inventoryTab = btn.dataset.tab;
    jtdRenderInventory();
  });
}

/* =========================================================
   INIT
========================================================= */
function jtdInit(){
  jtdLoadGame();
  jtdBindGenericNav();
  jtdBindFlowButtons();
  jtdBindTabs();
  jtdRunLoadingSequence();
}

document.addEventListener("DOMContentLoaded", jtdInit);
