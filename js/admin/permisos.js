function ocultarPorPermiso(selector, permitido) {
  if (!permitido) document.querySelectorAll(selector).forEach(el => { el.hidden = true; el.style.setProperty("display", "none", "important"); });
}
document.querySelectorAll(".badge-rol-admin").forEach(el => el.textContent = permisos.etiqueta(sesion.rol()));
ocultarPorPermiso('#usuarios-admin, a[href="#usuarios-admin"]', permisos.tiene("usuarios"));
ocultarPorPermiso('#solicitudes-admin, a[href="#solicitudes-admin"]', permisos.tiene("password"));
ocultarPorPermiso('#seguimiento-admin, a[href="#seguimiento-admin"], .abrir-excelencia', permisos.tiene("reportes"));
ocultarPorPermiso('#actividad-admin, a[href="#actividad-admin"], #notificaciones-admin, a[href="#notificaciones-admin"], .admin-campana-wrap', permisos.tiene("usuarios"));
ocultarPorPermiso('#tutorial-admin, a[href="#tutorial-admin"]', permisos.tiene("tutorial"));
ocultarPorPermiso('[data-solo-superadmin]', sesion.rol() === "superadmin");
ocultarPorPermiso('#alta-curso, [data-abrir-form="alta-curso"], .cursos-admin-guia', permisos.tiene("crearCursos"));
ocultarPorPermiso('.curso-editor-asignacion', false);
if (sesion.rol() === "instructor") {
  // El Instructor usa su propio módulo de cursos; no comparte el identificador del panel Admin.
  const cursosInstructor = document.getElementById("cursos-admin");
  if (cursosInstructor) {
    cursosInstructor.id = "cursos-instructor";
    cursosInstructor.dataset.modulo = "instructor";
    cursosInstructor.querySelector(".cursos-admin-kicker")?.replaceChildren(document.createTextNode("Cursos del instructor"));
    cursosInstructor.querySelector("h2")?.replaceChildren(document.createTextNode("Crear y administrar mis cursos"));
    const descripcion = cursosInstructor.querySelector(".cursos-admin-encabezado .muted");
    if (descripcion) descripcion.textContent = "Crea y edita tus cursos. Cada cambio se envía al administrador para aprobación.";
  }
  document.getElementById("comunicados-admin")?.remove();
  document.getElementById("mis-solicitudes-cursos").hidden = false;
  ocultarPorPermiso('#resumen-admin, a[href="#resumen-admin"]', false);
  ocultarPorPermiso('#tutorial-admin, .admin-sidebar-pie, #nombre-admin-top', false);
  document.querySelectorAll('.admin-sidebar-marca, .admin-breadcrumbs a').forEach(enlace => {
    enlace.href = "../trabajador/inicio.html";
    enlace.hidden = false;
    enlace.style.removeProperty("display");
    enlace.setAttribute("aria-label", "Ir a Inicio");
    if (enlace.closest(".admin-breadcrumbs")) enlace.textContent = "Inicio";
  });
  const menuInstructor = document.querySelector('#admin-sidebar nav');
  if (menuInstructor) {
    const opciones = [
      { nombre: "Inicio", href: "../trabajador/inicio.html", icono: '<path d="m3 10 9-7 9 7v11h-6v-8H9v8H3Z"/>' },
      { nombre: "Cursos", href: "#cursos-instructor", icono: '<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4ZM12 6v16"/>' },
      { nombre: "Tutorial de uso", href: "../trabajador/tutorial.html", icono: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17v1"/>' },
      { nombre: "Mis solicitudes", href: "#mis-solicitudes-cursos", icono: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>' },
      { nombre: "Soporte y ayuda", href: "../trabajador/soporte.html", icono: '<path d="M4 13v-2a8 8 0 0 1 16 0v2M4 12H2v6h4v-6H4Zm16 0h2v6h-4v-6h2ZM20 18v3h-6"/>' }
    ];
    menuInstructor.replaceChildren(...opciones.map(opcion => {
      const enlace = document.createElement("a");
      enlace.href = opcion.href;
      const icono = document.createElement("span");
      icono.className = "admin-nav-icono";
      icono.setAttribute("aria-hidden", "true");
      icono.innerHTML = '<svg viewBox="0 0 24 24">' + opcion.icono + '</svg>';
      enlace.append(icono, document.createTextNode(" " + opcion.nombre));
      return enlace;
    }));
  }
}
if (["admin", "superadmin"].includes(sesion.rol())) {
  document.querySelectorAll('[data-asistencia-admin]').forEach(enlace => {
    enlace.hidden = false;
    enlace.style.removeProperty("display");
  });
}
const explicacionRol = document.createElement("p");
explicacionRol.className = "muted";
explicacionRol.textContent = {
  superadmin: "Acceso completo: usuarios, administradores, contraseñas, contenidos, aprobación y asignación de cursos.",
  admin: "Asigna los cursos a trabajadores y áreas, y administra el seguimiento permitido. La aprobación, eliminación y gestión de contraseñas corresponden al Súper administrador.",
  instructor: "Crea y edita cursos. Los cambios quedan pendientes de aprobación."
}[sesion.rol()] || "";
if (sesion.rol() !== "instructor") {
  document.querySelector(".contenedor-admin")?.prepend(explicacionRol);
}
document.querySelector("#usuarios-admin h2")?.replaceChildren(document.createTextNode("Usuarios y roles"));
document.querySelector("#solicitudes-admin h2")?.replaceChildren(document.createTextNode("Contraseñas de usuarios"));

function abrirAsignacionCurso(id) {
  permisos.exigir("asignarCursos");
  const curso = listaCursos.find(c => c.id === id);
  if (!curso) return;

  const modal = document.createElement("dialog");
  modal.className = "modal-asignacion-cicsa";
  const activos = listaUsuarios.filter(u => u.rol === "trabajador" && u.activo);
  const catalogoAreas = ["Fabricación", "Servicios y Procesos Especiales", "Arrenmaq", "Administración y Finanzas", "Licitaciones y Contratos", "Recursos Humanos", "Compras", "Tecnología, Innovación y Desarrollo", "QHSE", "Dirección General", "Almacén", "Mantenimiento", "Operaciones"];
  const areasRegistradas = activos.map(u => String(u.area || "Sin asignar").trim() || "Sin asignar");
  const areas = [...new Set([...catalogoAreas, ...areasRegistradas])].sort((a,b)=>a.localeCompare(b,"es"));
  const seleccionados = new Set((curso.asignadoAIds || []).map(String));
  const todosInicial = curso.asignadoA === "Todos";
  const areasIniciales = new Set();

  modal.innerHTML = `<form class="asignacion-modal-form" novalidate>
    <header class="asig-header">
      <div class="asig-icono" aria-hidden="true">♧</div>
      <div class="asig-titulos"><span class="asig-kicker">GESTIÓN DE CAPACITACIÓN</span><h2>Asignar trabajadores</h2><p class="asig-curso"></p></div>
      <button class="asig-cerrar" type="button" data-cerrar aria-label="Cerrar ventana">×</button>
    </header>
    <section class="asig-todos">
      <label class="asig-check-principal"><input type="checkbox" name="todos" ${todosInicial ? "checked" : ""}><span><strong>Asignar a todos los trabajadores</strong><small>El curso estará disponible para todo el personal activo.</small></span></label>
    </section>
    <section class="asig-filtros">
      <div class="asig-campo asig-area-campo"><label class="asig-label">Filtrar por área</label>
        <button class="asig-area-trigger" type="button" aria-expanded="false"><span class="asig-area-resumen">Todas las áreas</span><span aria-hidden="true">⌄</span></button>
        <div class="asig-area-panel" hidden>
          <input type="search" class="asig-area-buscar" placeholder="Buscar área…" aria-label="Buscar área">
          <div class="asig-area-lista">${areas.map(a=>`<label class="asig-area-opcion"><input type="checkbox" value="${escaparHtml(a)}"><span>${escaparHtml(a)}</span></label>`).join("")}</div>
        </div>
        <small class="asig-ayuda">Puedes seleccionar una o varias áreas.</small>
      </div>
      <div class="asig-campo"><label class="asig-label" for="asig-buscar-trabajador">Buscar trabajador</label>
        <div class="asig-buscar-wrap"><span aria-hidden="true">⌕</span><input id="asig-buscar-trabajador" type="search" name="buscar" placeholder="Nombre, correo o área…" autocomplete="off"></div>
        <small class="asig-ayuda">Busca por nombre, correo o departamento.</small>
      </div>
    </section>
    <div class="asig-toolbar"><div class="asig-acciones-visibles"><button type="button" class="asig-btn-ligero" data-seleccionar-visibles>Seleccionar visibles</button><button type="button" class="asig-btn-ligero" data-limpiar-visibles>Quitar visibles</button></div><span class="asignacion-contador" aria-live="polite"></span></div>
    <section class="asig-listado"><div class="asig-listado-head"><span>Trabajador</span><span>Área</span><span>Correo</span><span>Selección</span></div><div class="asignacion-opciones"></div></section>
    <footer class="asig-footer"><div class="asig-resumen"><span class="asig-resumen-icono" aria-hidden="true">✓</span><span><strong class="asig-resumen-numero">0 trabajadores seleccionados</strong><small>Se guardará la asignación de este curso.</small></span></div><div class="asig-footer-acciones"><button class="asig-btn-cancelar" type="button" data-cerrar>Cancelar</button><button class="asig-btn-guardar" type="submit"><span aria-hidden="true">✓</span> Guardar asignación</button></div></footer>
    <div class="asig-alerta" role="alert"></div>
  </form>`;

  modal.querySelector(".asig-curso").textContent = curso.nombre || "Curso seleccionado";
  const todos = modal.querySelector('[name="todos"]');
  const buscador = modal.querySelector('[name="buscar"]');
  const opciones = modal.querySelector(".asignacion-opciones");
  const contador = modal.querySelector(".asignacion-contador");
  const resumen = modal.querySelector(".asig-resumen-numero");
  const areaTrigger = modal.querySelector(".asig-area-trigger");
  const areaPanel = modal.querySelector(".asig-area-panel");
  const areaBuscar = modal.querySelector(".asig-area-buscar");
  const areaChecks = [...modal.querySelectorAll(".asig-area-opcion input")];
  const areasSeleccionadas = () => areaChecks.filter(c=>c.checked).map(c=>c.value);
  const visiblesActuales = () => {
    const filtro = buscador.value.trim().toLocaleLowerCase();
    const areasSel = areasSeleccionadas();
    return activos.filter(u => {
      const area = String(u.area || "Sin asignar").trim() || "Sin asignar";
      const coincideArea = !areasSel.length || areasSel.includes(area);
      const texto = [u.nombre,u.correo,u.area,u.puesto].join(" ").toLocaleLowerCase();
      return coincideArea && (!filtro || texto.includes(filtro));
    });
  };
  function actualizarResumenArea(){
    const seleccion = areasSeleccionadas();
    const etiqueta = modal.querySelector(".asig-area-resumen");
    etiqueta.innerHTML = seleccion.length ? seleccion.map(a=>`<span class="asig-chip">${escaparHtml(a)} <b aria-hidden="true">✓</b></span>`).join("") : "Todas las áreas";
    areaTrigger.setAttribute("aria-expanded", String(!areaPanel.hidden));
  }
  function pintarOpciones(){
    const visibles = visiblesActuales();
    opciones.innerHTML = visibles.map(u=>{
      const idUsuario=String(u.id), area=String(u.area||"Sin asignar").trim()||"Sin asignar";
      const iniciales=String(u.nombre||"?").trim().split(/\s+/).slice(0,2).map(n=>n[0]||"").join("").toUpperCase();
      return `<label class="asig-trabajador${seleccionados.has(idUsuario)?" seleccionado":""}"><span class="asig-persona"><input type="checkbox" value="${escaparHtml(idUsuario)}" ${seleccionados.has(idUsuario)?"checked":""} ${todos.checked?"disabled":""}><span class="asig-avatar">${escaparHtml(iniciales)}</span><span class="asig-persona-texto"><strong>${escaparHtml(u.nombre||"Sin nombre")}</strong><small>${escaparHtml(u.puesto||"Trabajador")}</small></span></span><span class="asig-area-celda">${escaparHtml(area)}</span><span class="asig-correo">${escaparHtml(u.correo||"Sin correo")}</span><span class="asig-estado-check" aria-hidden="true">✓</span></label>`;
    }).join("") || '<div class="asig-vacio"><span aria-hidden="true">⌕</span><strong>No se encontraron trabajadores</strong><small>Prueba con otra búsqueda o cambia el área seleccionada.</small></div>';
    contador.textContent = todos.checked ? `Todos los trabajadores · ${activos.length}` : `${seleccionados.size} seleccionados · ${visibles.length} visibles`;
    resumen.textContent = todos.checked ? `Todos los trabajadores (${activos.length})` : `${seleccionados.size} trabajador${seleccionados.size===1?"":"es"} seleccionado${seleccionados.size===1?"":"s"}`;
    opciones.querySelectorAll('input[type="checkbox"]').forEach(input=>input.addEventListener("change",()=>{
      if(input.checked) seleccionados.add(input.value); else seleccionados.delete(input.value);
      input.closest(".asig-trabajador")?.classList.toggle("seleccionado",input.checked);
      contador.textContent = `${seleccionados.size} seleccionados · ${visiblesActuales().length} visibles`;
      resumen.textContent = `${seleccionados.size} trabajador${seleccionados.size===1?"":"es"} seleccionado${seleccionados.size===1?"":"s"}`;
    }));
  }
  areaTrigger.addEventListener("click",()=>{areaPanel.hidden=!areaPanel.hidden;areaTrigger.setAttribute("aria-expanded",String(!areaPanel.hidden));if(!areaPanel.hidden)areaBuscar.focus();});
  areaChecks.forEach(c=>c.addEventListener("change",()=>{actualizarResumenArea();pintarOpciones();}));
  areaBuscar.addEventListener("input",()=>{const q=areaBuscar.value.trim().toLocaleLowerCase();modal.querySelectorAll(".asig-area-opcion").forEach(label=>{label.hidden=!label.textContent.toLocaleLowerCase().includes(q);});});
  todos.addEventListener("change",pintarOpciones);
  buscador.addEventListener("input",pintarOpciones);
  modal.querySelector("[data-seleccionar-visibles]").addEventListener("click",()=>{if(!todos.checked)visiblesActuales().forEach(u=>seleccionados.add(String(u.id)));pintarOpciones();});
  modal.querySelector("[data-limpiar-visibles]").addEventListener("click",()=>{visiblesActuales().forEach(u=>seleccionados.delete(String(u.id)));pintarOpciones();});
  actualizarResumenArea();
  pintarOpciones();
  modal.querySelectorAll("[data-cerrar]").forEach(b=>b.addEventListener("click",()=>modal.close()));
  modal.addEventListener("close",()=>modal.remove());
  modal.querySelector("form").onsubmit=async e=>{
    e.preventDefault();
    const boton=modal.querySelector('[type="submit"]');
    boton.disabled=true;
    try{
      await cursos.asignar(id,{asignadoA:todos.checked?"Todos":"",asignadoAIds:todos.checked?[]:[...seleccionados].map(Number)});
      modal.close();
      await cargarTodo();
    }catch(error){modal.querySelector('[role="alert"]').textContent=error.message;}
    finally{boton.disabled=false;}
  };
  document.body.append(modal);
  modal.showModal();
}
