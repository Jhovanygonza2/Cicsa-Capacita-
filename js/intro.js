// La bienvenida se reproduce una vez por carga, sin reiniciarse al perder el foco.
(() => {
  const intro = document.querySelector('.intro-cicsa');
  if (!intro) return;
  let finalizada = false;
  let respaldo;

  function finalizarEntrada() {
    if (finalizada) return;
    finalizada = true;
    clearTimeout(respaldo);
    document.documentElement.classList.add('entrada-login-completa');
    intro.remove();
    document.removeEventListener('focusin', finalizarEntrada);
    document.removeEventListener('animationend', alTerminarAnimacion);
    window.removeEventListener('pagehide', finalizarEntrada);
  }

  function alTerminarAnimacion(event) {
    if (event.target === intro && event.animationName === 'intro-cicsa-fin') {
      intro.remove();
    }
    if (event.target.id === 'btn-login' && event.animationName === 'entrada-login') {
      finalizarEntrada();
    }
  }

  document.addEventListener('focusin', finalizarEntrada);
  document.addEventListener('animationend', alTerminarAnimacion);
  window.addEventListener('pagehide', finalizarEntrada);
  respaldo = setTimeout(finalizarEntrada, 2800);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      (document.activeElement && document.activeElement !== document.body &&
       document.activeElement !== document.documentElement)) {
    finalizarEntrada();
  }
})();