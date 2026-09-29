// Animaciones de entrada: una sola ejecucion por carga de la pagina.
(() => {
  const root = document.querySelector('.aprendizaje-animado');
  if (!root || root.dataset.entradaIniciada) return;
  root.dataset.entradaIniciada = 'true';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || typeof root.animate !== 'function') return;

  const active = new Set();
  let observer;
  function enter(element, delay = 0) {
    if (!element || reduced.matches) return;
    const animation = element.animate([
      { opacity: 0, translate: '0 16px' },
      { opacity: 1, translate: '0 0' }
    ], {
      duration: 550, delay,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards', iterations: 1
    });
    active.add(animation);
    animation.onfinish = () => active.delete(animation);
    animation.oncancel = () => active.delete(animation);
  }

  enter(root.querySelector('.marca-corporativa'));
  enter(root.querySelector('.dashboard-main .encabezado-vista'), 60);
  enter(root.querySelector('.barra-acciones'), 140);
  root.querySelectorAll('.dashboard-sidebar > .tarjeta').forEach((card, index) => {
    enter(card, 160 + index * 90);
  });

  const grid = root.querySelector('#rejilla-cursos-trabajador');
  function enterCourses() {
    const cards = grid.querySelectorAll('.tarjeta-curso');
    if (!cards.length) return;
    observer?.disconnect();
    // Limitar la cascada a las primeras tarjetas para no retrasar listas largas.
    Array.from(cards).slice(0, 8).forEach((card, index) => enter(card, index * 80));
  }
  if (grid) {
    observer = new MutationObserver(enterCourses);
    observer.observe(grid, { childList: true });
    enterCourses();
  }

  function stop() {
    observer?.disconnect();
    active.forEach(animation => animation.cancel());
    active.clear();
  }
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
  window.addEventListener('pagehide', stop, { once: true });
})();