(() => {
  if (!document.getElementById("comunicados-trabajador")) return;
  if (!sesion.requerir(["trabajador", "instructor", "admin", "superadmin"])) return;
  sesion.vigilarInactividad(20);
  const rol = sesion.rol();
  document.querySelectorAll(".tarjeta-usuario-sidebar .rol").forEach(el => {
    el.textContent = permisos.etiqueta(rol);
  });
  if (rol !== "trabajador") {
    const menu = document.querySelector(".nav-lateral");
    const opciones = [
      ["Inicio", "inicio.html"],
      ["Cursos", rol === "instructor" ? "../instructor/cursos.html#cursos-instructor" : "../admin/dashboard.html#cursos-admin"],
      ["Tutorial de uso", "tutorial.html"],
      ["Mis solicitudes", rol === "instructor" ? "../instructor/cursos.html#mis-solicitudes-cursos" : "soporte.html#soporte-titulo-lista"],
      ["Soporte y ayuda", "soporte.html"]
    ];
    if (menu) {
      const iconos = [...menu.querySelectorAll(".icono")];
      menu.replaceChildren(...opciones.map(([nombre, href], indice) => {
        const item = document.createElement("li");
        const enlace = document.createElement("a");
        enlace.href = href;
        if (indice === 0) {
          enlace.className = "activo";
          enlace.setAttribute("aria-current", "page");
        }
        const icono = iconos[Math.min(indice, iconos.length - 1)];
        if (icono) enlace.append(icono.cloneNode(true));
        enlace.append(document.createTextNode(" " + nombre));
        item.append(enlace);
        return item;
      }));
    }
    const perfil = document.querySelector(".disparador-perfil");
    if (perfil) {
      perfil.href = rol === "instructor" ? "../instructor/cursos.html#cursos-instructor" : "../admin/dashboard.html#cursos-admin";
      perfil.setAttribute("aria-label", "Ir a mi panel");
    }
  }
  const barra = document.querySelector(".navbar-derecha");
  if (barra && !document.getElementById("btn-cerrar-sesion-inicio")) {
    const cerrar = document.createElement("button");
    cerrar.id = "btn-cerrar-sesion-inicio";
    cerrar.type = "button";
    cerrar.className = "btn btn-secundario btn-sm";
    cerrar.textContent = "Cerrar sesión";
    cerrar.addEventListener("click", () => sesion.cerrar());
    barra.append(cerrar);
  }
  const clave = "cicsa_comunicados";
  const contenedor = document.getElementById("comunicados-trabajador");
  const leer = () => { try { const v = JSON.parse(localStorage.getItem(clave) || "[]"); return Array.isArray(v) ? v.slice(0, 3) : []; } catch { return []; } };
  const escapar = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const categoriaBonita = valor => ({Curso:"Convocatoria", Mantenimiento:"Aviso", Importante:"Informativo"}[valor] || valor || "Aviso");
  const fechaBonita = (valor) => { if (!valor) return "Fecha no especificada"; const f = new Date(valor + (String(valor).length === 10 ? "T12:00:00" : "")); return Number.isNaN(f.getTime()) ? escapar(valor) : new Intl.DateTimeFormat("es-MX", {day:"numeric", month:"long", year:"numeric"}).format(f); };
  function pintar() {
    const datos = leer().sort((a,b) => String(b.fecha || b.creado || "").localeCompare(String(a.fecha || a.creado || "")));
    if (!contenedor) return;
    contenedor.innerHTML = datos.length ? datos.map(item => `<article class="comunicado-tarjeta${item.imagen ? "" : " sin-imagen"}">${item.imagen ? `<img class="comunicado-imagen" src="${item.imagen}" alt="Imagen del comunicado: ${escapar(item.titulo)}">` : ""}<div class="comunicado-cuerpo"><div class="comunicado-meta"><span class="comunicado-categoria">${escapar(categoriaBonita(item.categoria))}</span><time>${fechaBonita(item.fecha)}</time></div><h2>${escapar(item.titulo)}</h2>${item.texto ? `<p>${escapar(item.texto).replace(/\n/g,"<br>")}</p>` : item.imagen ? `<p class="comunicado-solo-imagen">Comunicado con imagen</p>` : ""}</div></article>`).join("") : `<div class="comunicados-vacio"><div class="comunicados-vacio-icono">i</div><h2>Por ahora no hay comunicados</h2><p>Cuando se publique un aviso, aparecerá aquí.</p></div>`;
  }
  if (sesion.activa()) { const usuario = sesion.usuario(); const nombre = String(usuario?.nombre || "Trabajador").trim(); document.querySelectorAll("#nombre-trabajador,#nombre-trabajador-compact").forEach(e => e.textContent = nombre); const saludo = document.getElementById("saludo-inicio"); if (saludo) saludo.textContent = `Hola, ${nombre.split(/\s+/)[0]}`; const iniciales = nombre.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(); document.querySelectorAll("#avatar-trabajador,#avatar-trabajador-compact").forEach(e=>e.textContent=iniciales); }
  window.addEventListener("storage", e => { if (e.key === clave || e.key === null) pintar(); });
  window.addEventListener("pageshow", pintar);
  window.addEventListener("focus", pintar);
  pintar();
})();
