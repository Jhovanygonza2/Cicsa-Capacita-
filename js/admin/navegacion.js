// Navegación administrativa: secciones, formularios y menú adaptable.
function activarSeccionAdmin(id) {
  const enlaces = document.querySelectorAll('#admin-sidebar nav a[href^="#"]');
  let titulo = '';
  enlaces.forEach(enlace => {
    const activo = enlace.getAttribute('href') === `#${id}`;
    enlace.classList.toggle('activo', activo);
    if (activo) { enlace.setAttribute('aria-current', 'location'); titulo = enlace.textContent.trim(); }
    else enlace.removeAttribute('aria-current');
  });
  const indicador = document.getElementById('admin-seccion-actual');
  if (titulo && indicador) indicador.textContent = titulo;
}

(() => {
  const shell = document.querySelector('.admin-shell');
  const sidebar = document.getElementById('admin-sidebar');
  const toggle = document.getElementById('btn-menu-admin');
  if (!shell || !sidebar || !toggle) return;
  const movil = window.matchMedia('(max-width: 700px)');
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const secciones = [...document.querySelectorAll('.contenedor-admin > section[id]')].filter((el, i, arr) => arr.indexOf(el) === i && !el.hidden);
  const enlaces = [...sidebar.querySelectorAll('nav a')];
  enlaces.forEach(enlace => {
    const nombre = enlace.textContent.trim();
    enlace.title = nombre;
    enlace.setAttribute('aria-label', nombre);
  });

  function sincronizarMenu() {
    const abierto = movil.matches ? sidebar.classList.contains('abierto') : !shell.classList.contains('admin-sidebar-colapsado');
    toggle.setAttribute('aria-expanded', String(abierto));
    toggle.setAttribute('aria-label', abierto ? 'Contraer navegación' : 'Abrir navegación');
    sidebar.inert = movil.matches && !abierto;
  }
  function cerrarMenu(devolverFoco = false) {
    if (!movil.matches) return;
    sidebar.classList.remove('abierto');
    shell.classList.remove('admin-menu-abierto');
    if (devolverFoco) toggle.focus();
    sincronizarMenu();
  }
  toggle.addEventListener('click', () => {
    if (movil.matches) {
      const abierto = sidebar.classList.toggle('abierto');
      shell.classList.toggle('admin-menu-abierto', abierto);
      sincronizarMenu();
      if (abierto) sidebar.querySelector('a').focus();
    } else {
      shell.classList.toggle('admin-sidebar-colapsado');
      sincronizarMenu();
    }
  });
  document.getElementById('btn-cerrar-menu-admin')?.addEventListener('click', () => cerrarMenu(true));
  document.addEventListener('pointerdown', event => {
    if (sidebar.classList.contains('abierto') && !event.target.closest('#admin-sidebar, #btn-menu-admin')) cerrarMenu(true);
  });
  document.addEventListener('keydown', event => {
    if (!movil.matches || !sidebar.classList.contains('abierto')) return;
    if (event.key === 'Escape') { cerrarMenu(true); return; }
    if (event.key !== 'Tab') return;
    const controles = [...sidebar.querySelectorAll('a, button')].filter(el => el.getClientRects().length);
    const primero = controles[0], ultimo = controles[controles.length - 1];
    if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus(); }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus(); }
  });
  movil.addEventListener('change', () => {
    sidebar.classList.remove('abierto');
    shell.classList.remove('admin-menu-abierto');
    sincronizarMenu();
  });
  sincronizarMenu();

  function irASeccion(id, formulario, guardarHistorial = true) {
    const seccion = document.getElementById(id);
    if (!seccion || seccion.hidden) return;
    cerrarMenu();
    const panel = formulario && document.getElementById(formulario);
    if (panel && seccion.contains(panel)) panel.open = true;
    const destino = panel || seccion;
    if (guardarHistorial && location.hash !== `#${id}`) {
      try { history.pushState(null, '', `#${id}`); }
      catch (error) { location.hash = id; }
    }
    activarSeccionAdmin(id);
    const foco = panel ? panel.querySelector('input:not([type="hidden"]), select') : seccion.querySelector('h2');
    if (foco) { if (!panel) foco.tabIndex = -1; foco.focus({ preventScroll: true }); }
    destino.scrollIntoView({ behavior: movimientoReducido.matches ? 'auto' : 'smooth', block: 'start', inline: 'nearest' });
    // No iniciar otro scroll aquí: cancelaría el desplazamiento hacia la sección.
  }
  document.querySelectorAll('#admin-sidebar a[href^="#"], .admin-acciones-rapidas a[href^="#"], .admin-breadcrumbs a[href^="#"]').forEach(enlace => {
    enlace.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const id = enlace.hash.slice(1);
      if (!document.getElementById(id)) return;
      irASeccion(id, enlace.dataset.abrirForm);
      event.preventDefault();
    });
  });
  window.addEventListener('hashchange', () => irASeccion(location.hash.slice(1) || secciones[0]?.id, null, false));
  if (location.hash) requestAnimationFrame(() => irASeccion(location.hash.slice(1), null, false));

  // Recalcular con todas las secciones evita activar entradas aisladas del observador.
  let pendiente = false;
  function actualizarSeccionVisible() {
    pendiente = false;
    const limite = (document.querySelector('.topbar-admin')?.getBoundingClientRect().bottom || 0) + 80;
    let actual = secciones[0];
    for (const seccion of secciones) if (seccion.getBoundingClientRect().top <= limite) actual = seccion;
    if (actual) activarSeccionAdmin(actual.id);
  }
  window.addEventListener('scroll', () => {
    if (!pendiente) { pendiente = true; requestAnimationFrame(actualizarSeccionVisible); }
  }, { passive: true });
  actualizarSeccionVisible();

  // Excelencia usa enlaces HTML nativos para no depender de ventanas emergentes.
})();
