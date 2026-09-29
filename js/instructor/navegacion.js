// Navegación exclusiva del módulo Instructor.
(() => {
  const shell = document.querySelector('.admin-shell');
  const sidebar = document.getElementById('admin-sidebar');
  const toggle = document.getElementById('btn-menu-admin');
  if (!shell || !sidebar || !toggle) return;
  const movil = window.matchMedia('(max-width: 700px)');

  function sincronizarMenu() {
    const abierto = movil.matches ? sidebar.classList.contains('abierto') : !shell.classList.contains('admin-sidebar-colapsado');
    toggle.setAttribute('aria-expanded', String(abierto));
    sidebar.inert = movil.matches && !abierto;
  }
  function cerrarMenu() {
    if (!movil.matches) return;
    sidebar.classList.remove('abierto');
    shell.classList.remove('admin-menu-abierto');
    sincronizarMenu();
  }
  toggle.addEventListener('click', () => {
    if (movil.matches) {
      const abierto = sidebar.classList.toggle('abierto');
      shell.classList.toggle('admin-menu-abierto', abierto);
    } else {
      shell.classList.toggle('admin-sidebar-colapsado');
    }
    sincronizarMenu();
  });
  document.getElementById('btn-cerrar-menu-admin')?.addEventListener('click', cerrarMenu);
  movil.addEventListener('change', () => { cerrarMenu(); sincronizarMenu(); });
  sincronizarMenu();

  function activar(id) {
    sidebar.querySelectorAll('nav a[href^="#"]').forEach((enlace) => {
      const activo = enlace.getAttribute('href') === `#${id}`;
      enlace.classList.toggle('activo', activo);
      if (activo) enlace.setAttribute('aria-current', 'location');
      else enlace.removeAttribute('aria-current');
    });
    const actual = document.getElementById('admin-seccion-actual');
    if (actual) actual.textContent = id === 'mis-solicitudes-cursos' ? 'Mis solicitudes' : 'Cursos';
  }

  function irASeccion(id, formulario, guardar = true) {
    const seccion = document.getElementById(id);
    if (!seccion) return;
    cerrarMenu();
    const panel = formulario ? document.getElementById(formulario) : null;
    if (panel && seccion.contains(panel)) panel.open = true;
    if (guardar && location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    activar(id);
    (panel || seccion).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('#admin-sidebar a[href^="#"], .admin-acciones-rapidas a[href^="#"]').forEach((enlace) => {
    enlace.addEventListener('click', (evento) => {
      const id = enlace.hash.slice(1);
      if (!document.getElementById(id)) return;
      evento.preventDefault();
      irASeccion(id, enlace.dataset.abrirForm);
    });
  });
  window.addEventListener('hashchange', () => irASeccion(location.hash.slice(1) || 'cursos-instructor', null, false));
  if (location.hash) requestAnimationFrame(() => irASeccion(location.hash.slice(1), null, false));
})();
