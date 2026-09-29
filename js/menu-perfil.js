// menu-perfil.js — Control del drawer de perfil y gestión de sesión

function iniciarDrawerPerfil() {
  const u = sesion.usuario();
  if (!u) return;

  // Generar iniciales
  const ini = u.nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Actualizar avatares
  document.querySelectorAll("#nombre-trabajador, #nombre-admin").forEach((el) => {
    el.textContent = u.nombre;
  });

  document.querySelectorAll("#avatar-trabajador, #avatar-admin, #avatar-drawer").forEach((el) => {
    el.textContent = ini;
  });

  // Actualizar names compactos en navbar
  document.querySelectorAll("#nombre-trabajador-compact, #nombre-admin-compact").forEach((el) => {
    el.textContent = u.nombre.split(" ")[0];
  });

  document.querySelectorAll("#avatar-trabajador-compact, #avatar-admin-compact").forEach((el) => {
    el.textContent = ini;
  });

  // Actualizar drawer
  const nombreDrawer = document.getElementById("nombre-drawer");
  if (nombreDrawer) nombreDrawer.textContent = u.nombre.toUpperCase();

  const correoDrawer = document.getElementById("correo-drawer");
  if (correoDrawer) correoDrawer.textContent = u.correo || "";

  // Elementos del drawer
  const disparador = document.getElementById("disparador-perfil");
  const drawer = document.getElementById("drawer-perfil");
  const fondo = document.getElementById("fondo-drawer");
  const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

  // Funciones para abrir/cerrar
  function abrir() {
    drawer?.classList.add("activo");
    fondo?.classList.add("activo");
  }

  function cerrar() {
    drawer?.classList.remove("activo");
    fondo?.classList.remove("activo");
  }

  // Event listeners
  if (disparador) disparador.addEventListener("click", abrir);
  if (fondo) fondo.addEventListener("click", cerrar);
  if (btnCerrarSesion) btnCerrarSesion.addEventListener("click", () => {
    sesion.cerrar();
  });

  // Cerrar drawer al hacer click en un enlace
  const drawerItems = drawer?.querySelectorAll(".drawer-item");
  if (drawerItems) {
    drawerItems.forEach((item) => {
      item.addEventListener("click", cerrar);
    });
  }
}

function iniciarSidebarTrabajador() {
  const shell = document.querySelector(".app-shell");
  const sidebar = document.getElementById("sidebar-trabajador");
  const toggle = document.getElementById("btn-toggle-sidebar-trabajador");
  if (!shell || !sidebar || !toggle) return;

  const cerrar = () => {
    shell.classList.remove("sidebar-abierto");
    shell.classList.remove("sidebar-colapsado");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú de navegación");
  };

  toggle.addEventListener("click", () => {
    const esCompacto = !window.matchMedia("(max-width: 1024px)").matches;
    const clase = esCompacto ? "sidebar-colapsado" : "sidebar-abierto";
    const activo = shell.classList.toggle(clase);
    toggle.setAttribute("aria-expanded", String(activo));
    toggle.setAttribute("aria-label", activo ? "Cerrar menú de navegación" : "Abrir menú de navegación");
  });

  sidebar.addEventListener("click", (evento) => {
    if (evento.target.closest("a") && window.matchMedia("(max-width: 1024px)").matches) cerrar();
  });

  const cerrarAlTocarFuera = (evento) => {
    if (!window.matchMedia("(max-width: 1024px)").matches) return;
    if (!shell.classList.contains("sidebar-abierto")) return;
    if (evento.target.closest("#sidebar-trabajador, #btn-toggle-sidebar-trabajador")) return;
    cerrar();
  };

  document.addEventListener("pointerdown", cerrarAlTocarFuera);
  document.addEventListener("touchstart", cerrarAlTocarFuera, { passive: true });
  document.querySelector(".app-main-panel")?.addEventListener("click", cerrarAlTocarFuera);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && window.matchMedia("(max-width: 1024px)").matches) {
      cerrar();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(max-width: 1024px)").matches) {
      shell.classList.remove("sidebar-colapsado");
    } else {
      shell.classList.remove("sidebar-abierto");
    }
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  iniciarDrawerPerfil();
  iniciarSidebarTrabajador();
});
