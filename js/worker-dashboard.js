// worker-dashboard.js — Dashboard del trabajador con cursos asignados

sesion.requerir(["trabajador"]);
sesion.vigilarInactividad(20);

const trabajadorActual = sesion.usuario();
const bienvenidaTrabajador = document.getElementById("bienvenida-trabajador");
if (bienvenidaTrabajador && trabajadorActual?.nombre) {
  bienvenidaTrabajador.textContent = `Bienvenido, ${trabajadorActual.nombre.split(" ")[0]}`;
}

let itemsCursos = [];
let cursosVisibles = [];
let notificacionesMostradas = false;
const claveNotificaciones = `cicsa_notificaciones_descartadas_${trabajadorActual?.id || "anonimo"}`;
let notificacionesEliminadas = new Set();
try {
  const guardadas = JSON.parse(localStorage.getItem(claveNotificaciones) || "[]");
  if (Array.isArray(guardadas)) notificacionesEliminadas = new Set(guardadas.map(String));
} catch (error) { console.warn("No se pudieron leer las notificaciones descartadas.", error); }
let focoAntesNotificaciones = null;

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function tiempoRestanteCurso(curso) {
  const fin = fechaCierreCurso(curso);
  if (!fin) return "⏱ Sin horario configurado";
  if (estadoTemporalCurso(curso) === "programado") return "⏱ Duración: " + curso.horas + " h";
  const seg = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
  return seg === 0 ? "⏱ Tiempo terminado" : "⏱ " + Math.floor(seg / 3600) + "h " + Math.floor(seg % 3600 / 60) + "m restantes";
}

function formatoProgramacion(iso) { return iso ? new Date(iso).toLocaleString("es-MX", {dateStyle:"short",timeStyle:"short"}) : ""; }

function obtenerThumbnailSegura(url) {
  const fallback = "../assets/soldador.avif";
  if (!url) return fallback;
  try {
    const valor = new URL(url, window.location.href);
    const esRutaRelativa = !/^[a-z][a-z0-9+.-]*:/i.test(String(url));
    return esRutaRelativa || ["http:", "https:"].includes(valor.protocol)
      ? escaparHtml(esRutaRelativa ? String(url) : valor.href)
      : fallback;
  } catch (error) {
    return fallback;
  }
}

let solicitudMisCursos = 0;
let cargasMisCursosActivas = 0;
async function cargarMisCursos({ silencioso = false } = {}) {
  if (silencioso && cargasMisCursosActivas > 0) return;
  cargasMisCursosActivas++;
  const solicitudActual = ++solicitudMisCursos;
  const rejilla = document.getElementById("rejilla-cursos-trabajador");
  if (rejilla && !silencioso) {
    rejilla.classList.add("is-loading");
    rejilla.setAttribute("aria-busy", "true");
    rejilla.innerHTML = Array.from({ length: 3 }, () => `
      <article class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton-thumbnail"></div>
        <div class="skeleton skeleton-line skeleton-line-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line skeleton-line-short"></div>
      </article>
    `).join("");
  }
  try {
    const nuevosCursos = await progreso.misCursos();
    if (solicitudActual !== solicitudMisCursos || sesion.rol() !== "trabajador"
        || Number(sesion.usuario()?.id) !== Number(trabajadorActual?.id)) return;
    if (silencioso && JSON.stringify(nuevosCursos) === JSON.stringify(itemsCursos)) return;
    itemsCursos = nuevosCursos;
    cursosVisibles = itemsCursos;
    actualizarEstadisticas(itemsCursos);
    actualizarPanelLateral(itemsCursos);
    actualizarNotificaciones(itemsCursos);
    filtrarCursos();
  } catch (error) {
    if (solicitudActual !== solicitudMisCursos) return;
    if (silencioso) { console.warn("No se pudieron actualizar los horarios del curso.", error); return; }
    if (rejilla) {
      rejilla.textContent = error.message || "No se pudieron cargar tus cursos.";
      rejilla.classList.add("estado-error");
    }
  } finally {
    cargasMisCursosActivas--;
    if (solicitudActual === solicitudMisCursos) {
      rejilla?.classList.remove("is-loading");
      rejilla?.setAttribute("aria-busy", "false");
    }
  }
}

function pintarCursos(items) {
  const rejilla = document.getElementById("rejilla-cursos-trabajador");
  if (!rejilla) return;
  rejilla.innerHTML = items.length
    ? items.map(({ curso, progreso: p, asignado = true }) => { const temporal=estadoTemporalCurso(curso); const noAsignado=asignado === false; const bloqueado=temporal!=="abierto" || noAsignado; const etiqueta=noAsignado?"Solo visualización · curso no asignado":temporal==="programado"?`Abre ${formatoProgramacion(curso.fechaInicio)}`:temporal==="cerrado"?"Curso cerrado":(p.estado === "no_iniciado" ? "Comenzar" : "Continuar"); return `
      <${bloqueado ? "article" : "a"} class="tarjeta-curso" ${bloqueado ? 'aria-disabled="true"' : `href="lector.html?id=${encodeURIComponent(curso.id)}" aria-label="Abrir curso: ${escaparHtml(curso.nombre)}"`}>
        <div class="tarjeta-curso-thumbnail">
          <img loading="lazy" decoding="async" src="${obtenerThumbnailSegura(curso.thumbnail)}" alt="${escaparHtml(curso.nombre)}" />
        </div>
        <div class="tarjeta-curso-contenido">
          <div class="tarjeta-curso-titulo">${escaparHtml(curso.nombre)}</div>
          <div class="tarjeta-curso-meta"><span>${escaparHtml(curso.categoria || "General")}</span><span class="tiempo-card">${tiempoRestanteCurso(curso)}</span></div>
          <p class="muted">${escaparHtml(curso.descripcion || "")}</p>
          <div class="tarjeta-curso-progreso">
            <span>${p.porcentaje}%</span>
            <div class="progreso-barra"><div class="progreso-relleno" style="width:${p.porcentaje}%"></div></div>
          </div>
          ${curso.fechaInicio || curso.fechaFin ? `<div class="tarjeta-curso-horario"><small>📅 ${curso.fechaInicio ? `Abre: ${formatoProgramacion(curso.fechaInicio)}` : "Disponible al publicar"}</small><small>🔒 ${curso.fechaFin ? `Cierra: ${formatoProgramacion(curso.fechaFin)}` : "Sin fecha de cierre"}</small></div>` : ""}
          ${bloqueado ? `<p class="curso-disponibilidad">${escaparHtml(etiqueta)}</p>` : ""}
          ${noAsignado ? `<button type="button" class="btn btn-secundario btn-sm" data-ver-detalle-curso="${escaparHtml(String(curso.id))}">Ver detalles del curso</button>` : ""}
        </div>
      </${bloqueado ? "article" : "a"}>
    `; }).join("")
    : '<p class="muted">No hay cursos publicados por el momento.</p>';

  rejilla.querySelectorAll(".tarjeta-curso-thumbnail img").forEach((imagen) => {
    imagen.addEventListener("error", () => {
      if (imagen.dataset.fallbackAplicado === "true") return;
      imagen.dataset.fallbackAplicado = "true";
      imagen.src = "../assets/soldador.avif";
    });
  });
  rejilla.querySelectorAll("[data-ver-detalle-curso]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const item = items.find(({ curso }) => String(curso.id) === boton.dataset.verDetalleCurso);
      if (item) mostrarVistaPreviaCurso(item.curso);
    });
  });
}

function mostrarVistaPreviaCurso(curso) {
  document.getElementById("vista-previa-curso-publicado")?.remove();
  const modulos = (curso.modulos || []).map((modulo, i) => {
    const temas = modulo.temas?.length ? modulo.temas : [{ nombre: "Contenido", subtemas: modulo.lecciones || [] }];
    return `<section style="padding:12px 0;border-bottom:1px solid var(--borde-suave,#eee)"><h3>Tema ${i + 1}: ${escaparHtml(modulo.nombre || "Sin título")}</h3>${temas.map((tema, j) => `<div style="margin:10px 0"><strong>${escaparHtml(tema.nombre || `Unidad ${j + 1}`)}</strong><ul>${(tema.subtemas || []).map(sub => `<li>${escaparHtml(sub.nombre || "Subtema")}</li>`).join("") || "<li>Contenido del tema</li>"}</ul></div>`).join("")}</section>`;
  }).join("") || '<p class="muted">El curso todavía no tiene temas publicados.</p>';
  const modal = document.createElement("section");
  modal.id = "vista-previa-curso-publicado";
  modal.className = "perfil-trabajador-modal";
  modal.innerHTML = `<div class="perfil-trabajador-fondo" data-cerrar-vista-previa></div><article class="perfil-trabajador-card" role="dialog" aria-modal="true" aria-labelledby="vista-previa-curso-titulo"><button type="button" class="perfil-trabajador-cerrar" data-cerrar-vista-previa aria-label="Cerrar">×</button><span class="admin-bloque-kicker">Solo visualización</span><h2 id="vista-previa-curso-titulo">${escaparHtml(curso.nombre)}</h2><p>${escaparHtml(curso.descripcion || "Información del curso")}</p><p class="muted">${escaparHtml(curso.categoria || "General")} · ${escaparHtml(String(curso.horas || "—"))} horas</p><div style="max-height:55vh;overflow:auto">${modulos}</div><p class="curso-disponibilidad">Este curso no está asignado a tu cuenta. Puedes consultar su información, pero no iniciar actividades ni evaluaciones.</p></article>`;
  document.body.appendChild(modal);
  document.body.classList.add("admin-modal-abierto");
  const cerrar = () => { modal.remove(); document.body.classList.remove("admin-modal-abierto"); };
  modal.querySelectorAll("[data-cerrar-vista-previa]").forEach(el => el.addEventListener("click", cerrar));
  modal.querySelector(".perfil-trabajador-cerrar")?.focus();
}

function filtrarCursos() {
  const consulta = document.getElementById("buscar-curso")?.value.trim().toLowerCase() || "";
  const academia = document.getElementById("filtro-academia")?.value || "";
  const tipo = document.getElementById("filtro-tipo")?.value || "";
  cursosVisibles = itemsCursos.filter(({ curso }) => {
    const texto = [curso.nombre, curso.descripcion, curso.categoria, curso.academia].join(" ").toLowerCase();
    return (!consulta || texto.includes(consulta))
      && (!academia || curso.academia === academia)
      && (!tipo || curso.tipo === tipo);
  });
  pintarCursos(cursosVisibles);
}

function actualizarPanelLateral(items) {
  const logros = document.getElementById("logros-container");
  const tareas = document.getElementById("tareas-container");
  if (!logros || !tareas) return;
  const completados = items.filter(({ progreso }) => progreso.estado === "completado");
  logros.innerHTML = completados.length
    ? completados.slice(0, 3).map(({ curso }) => `
      <div class="logro-item"><span class="logro-icono">✓</span><div><strong>${escaparHtml(curso.nombre)}</strong><small>Curso completado</small></div></div>
    `).join("")
    : '<div class="panel-vacio">No hay logros todavía</div>';
  const pendientes = items.filter(({ progreso }) => progreso.estado !== "completado");
  tareas.innerHTML = pendientes.length
    ? pendientes.slice(0, 3).map(({ curso, progreso }) => `
      <div class="tarea-item"><strong>${progreso.estado === "no_iniciado" ? "Comenzar curso" : "Continuar curso"}</strong><span>${escaparHtml(curso.nombre)}</span></div>
    `).join("")
    : '<div class="panel-vacio">No tienes tareas pendientes</div>';
}

function iconoAviso(tipo) {
  const trazos = {
    completado: '<path d="m5 12 4 4L19 6"/>',
    programado: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cerrado: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    abierto: '<path d="M4 12h16m-6-6 6 6-6 6"/>'
  };
  return '<svg class="perfil-icono-lineal" viewBox="0 0 24 24" aria-hidden="true">' + trazos[tipo] + '</svg>';
}
function obtenerNotificacionesTrabajador(items, ahora = new Date()) {
  const avisos = [];
  items.forEach(({curso, progreso: avance}) => {
    if (avance?.estado === "completado") {
      avisos.push({id: String(curso.id), tipo: "completado", icono: iconoAviso("completado"), etiqueta: "Curso completado", nombre: curso.nombre, mensaje: "Terminaste este curso. Consulta tu logro en tu perfil."});
    } else if (curso.fechaInicio && ahora < new Date(curso.fechaInicio)) {
      avisos.push({id: `inicio-${curso.id}-${curso.fechaInicio}`, tipo: "programado", icono: iconoAviso("programado"), etiqueta: "Próxima apertura", nombre: curso.nombre, mensaje: `Disponible a partir del ${formatoProgramacion(curso.fechaInicio)}.`});
    } else if (curso.fechaFin && ahora > new Date(curso.fechaFin)) {
      avisos.push({id: `cerrado-${curso.id}-${curso.fechaFin}`, tipo: "cerrado", icono: iconoAviso("cerrado"), etiqueta: "Curso cerrado", nombre: curso.nombre, mensaje: `El periodo de este curso terminó el ${formatoProgramacion(curso.fechaFin)}.`});
    } else if (curso.fechaInicio && ahora >= new Date(curso.fechaInicio)) {
      avisos.push({id: `abierto-${curso.id}-${curso.fechaInicio}`, tipo: "abierto", icono: iconoAviso("abierto"), etiqueta: "Ya disponible", nombre: curso.nombre, mensaje: curso.fechaFin ? `El curso ya comenzó. Cierra el ${formatoProgramacion(curso.fechaFin)}.` : "El curso está abierto. Puedes comenzar cuando quieras."});
    }
  });
  return avisos.filter(aviso => !notificacionesEliminadas.has(aviso.id));
}

function actualizarNotificaciones(items) {
  const btn = document.getElementById("btn-notificaciones");
  const badge = document.getElementById("notificaciones-badge");
  if (!btn || !badge) return;
  const avisos = obtenerNotificacionesTrabajador(items);
  btn.style.display = "inline-flex";
  btn.title = avisos.length ? `Tienes ${avisos.length} notificaciones` : "Sin notificaciones";
  btn.setAttribute("aria-label", btn.title);
  badge.textContent = avisos.length;
  badge.style.display = avisos.length ? "flex" : "none";
  const completado = avisos.find(aviso => aviso.tipo === "completado");
  if (completado && !notificacionesMostradas) {
    mostrarToast("¡Curso completado!", completado.nombre);
    notificacionesMostradas = true;
  }
}

function descartarNotificaciones(ids) {
  const siguientes = new Set([...notificacionesEliminadas, ...ids.map(String)]);
  try {
    localStorage.setItem(claveNotificaciones, JSON.stringify([...siguientes]));
  } catch (error) {
    document.getElementById("notificaciones-error").textContent = "No se pudo guardar el cambio. Intenta quitar la notificación de nuevo.";
    return;
  }
  notificacionesEliminadas = siguientes;
  document.getElementById("notificaciones-error").textContent = "";
  actualizarNotificaciones(itemsCursos);
  pintarNotificacionesTrabajador();
  document.getElementById("notificaciones-estado").textContent = ids.length === 1 ? "Notificación eliminada." : "Notificaciones eliminadas.";
  const siguiente = document.querySelector("#lista-notificaciones .btn-quitar-notificacion");
  (siguiente || document.querySelector(".modal-notificaciones-close"))?.focus();
}

function pintarNotificacionesTrabajador() {
  const lista = document.getElementById("lista-notificaciones");
  const avisos = obtenerNotificacionesTrabajador(itemsCursos);
  document.getElementById("notificaciones-resumen").textContent = avisos.length ? `${avisos.length} aviso${avisos.length === 1 ? " pendiente" : "s pendientes"}` : "Avisos de tus cursos";
  document.getElementById("btn-quitar-todas-notificaciones").hidden = !avisos.length;
  lista.innerHTML = avisos.length ? avisos.map(aviso => `
    <article class="item-notificacion notificacion-${aviso.tipo}">
      <div class="item-notificacion-icono" aria-hidden="true">${aviso.icono}</div>
      <div class="item-notificacion-texto"><small class="notificacion-etiqueta">${aviso.etiqueta}</small><strong>${escaparHtml(aviso.nombre)}</strong><span>${escaparHtml(aviso.mensaje)}</span></div>
      <button type="button" class="btn-quitar-notificacion" data-notificacion-id="${escaparHtml(aviso.id)}" aria-label="Quitar notificación: ${escaparHtml(aviso.nombre)}">Quitar</button>
    </article>`).join("") : '<div class="notificaciones-vacias"><span class="notificaciones-vacias-icono" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/><path d="m9 10 2 2 4-4"/></svg></span><div><strong>No tienes avisos pendientes</strong><p>Te avisaremos cuando haya novedades en tus cursos.</p></div></div>';
}

function abrirModalNotificaciones() {
  const modal = document.getElementById("modal-notificaciones");
  if (!modal) return;
  focoAntesNotificaciones = document.activeElement;
  pintarNotificacionesTrabajador();
  modal.classList.remove("oculto");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("notificaciones-abiertas");
  document.getElementById("btn-notificaciones")?.setAttribute("aria-expanded", "true");
  modal.querySelector(".modal-notificaciones-close")?.focus();
}

function cerrarModalNotificaciones() {
  const modal = document.getElementById("modal-notificaciones");
  if (!modal) return;
  modal.classList.add("oculto");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("notificaciones-abiertas");
  document.getElementById("btn-notificaciones")?.setAttribute("aria-expanded", "false");
  if (focoAntesNotificaciones?.isConnected) focoAntesNotificaciones.focus();
}

function mostrarToast(mensaje, cursoNombre = "Curso") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  const icono = document.createElement("span");
  icono.className = "toast-icono";
  icono.textContent = "✓";
  const contenido = document.createElement("div");
  contenido.style.flex = "1";
  const titulo = document.createElement("strong");
  titulo.textContent = mensaje;
  const curso = document.createElement("div");
  curso.textContent = cursoNombre;
  curso.style.cssText = "font-size: 12px; opacity: 0.9; margin-top: 4px;";
  contenido.append(titulo, curso);
  const cerrar = document.createElement("button");
  cerrar.className = "btn btn-texto toast-close";
  cerrar.type = "button";
  cerrar.setAttribute("aria-label", "Cerrar notificación");
  cerrar.textContent = "✕";
  cerrar.style.cssText = "color: white; padding: 0 4px; min-width: auto;";
  toast.append(icono, contenido, cerrar);
  cerrar.addEventListener("click", () => toast.remove());

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2800);
}

function actualizarEstadisticas(items) {
  const completados = items.filter((i) => i.progreso.estado === "completado").length;
  const enProceso = items.filter((i) => i.progreso.estado === "en_proceso").length;
  const noIniciados = items.filter((i) => i.progreso.estado === "no_iniciado").length;

  document.getElementById("stat-completados").textContent = completados;
  document.getElementById("stat-progreso").textContent = enProceso;
  document.getElementById("stat-noIniciados").textContent = noIniciados;
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  const btnNotificaciones = document.getElementById("btn-notificaciones");
  const modalNotificaciones = document.getElementById("modal-notificaciones");
  const btnCerrarNotificaciones = document.querySelector(".modal-notificaciones-close");

  document.getElementById("lista-notificaciones")?.addEventListener("click", (event) => {
    const boton = event.target.closest("[data-notificacion-id]");
    if (boton) descartarNotificaciones([boton.dataset.notificacionId]);
  });
  document.getElementById("btn-quitar-todas-notificaciones")?.addEventListener("click", () => {
    descartarNotificaciones(obtenerNotificacionesTrabajador(itemsCursos).map(aviso => aviso.id));
  });
  if (btnNotificaciones) {
    btnNotificaciones.addEventListener("click", abrirModalNotificaciones);
  }

  if (btnCerrarNotificaciones) {
    btnCerrarNotificaciones.addEventListener("click", cerrarModalNotificaciones);
  }

  ["buscar-curso", "filtro-academia", "filtro-tipo"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", filtrarCursos);
    document.getElementById(id)?.addEventListener("change", filtrarCursos);
  });

  const rejillaCursos = document.getElementById("rejilla-cursos-trabajador");
  document.getElementById("vista-grilla")?.addEventListener("click", () => {
    rejillaCursos?.classList.remove("vista-lista");
    document.getElementById("vista-grilla")?.classList.add("activo");
    document.getElementById("vista-lista")?.classList.remove("activo");
  });

  document.querySelector(".help-btn")?.addEventListener("click", () => { window.location.href = "tutorial.html"; });


  if (modalNotificaciones) {
    modalNotificaciones.addEventListener("click", (event) => {
      if (event.target === modalNotificaciones) {
        cerrarModalNotificaciones();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && modalNotificaciones && !modalNotificaciones.classList.contains("oculto")) {
      const controles = [...modalNotificaciones.querySelectorAll("button")].filter(b => !b.hidden && !b.disabled && b.getClientRects().length);
      const primero = controles[0], ultimo = controles[controles.length - 1];
      if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo?.focus(); }
      else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero?.focus(); }
    }
    if (event.key === "Escape" && modalNotificaciones && !modalNotificaciones.classList.contains("oculto")) {
      cerrarModalNotificaciones();
    }
  });

  // Cargar cursos
  cargarMisCursos();
});


// Actualiza las tarjetas al cambiar de minuto o alcanzar apertura/cierre.
let firmaHorariosCursos = "";
function refrescarHorariosCursos() {
  if (!sesion.activa() || !itemsCursos.length) return;
  const firma = itemsCursos.map(({curso}) => curso.id + ":" + estadoTemporalCurso(curso) + ":" + tiempoRestanteCurso(curso)).join("|");
  if (firma === firmaHorariosCursos) return;
  firmaHorariosCursos = firma;
  filtrarCursos();
}
setInterval(refrescarHorariosCursos, 1000);
function consultarHorariosActualizados() {
  if (document.hidden || !sesion.activa() || sesion.rol() !== "trabajador"
      || Number(sesion.usuario()?.id) !== Number(trabajadorActual?.id)) return;
  return cargarMisCursos({ silencioso: true });
}
window.addEventListener("focus", consultarHorariosActualizados);
window.addEventListener("pageshow", (evento) => {
  if (evento.persisted) consultarHorariosActualizados();
});
document.addEventListener("visibilitychange", consultarHorariosActualizados);
window.addEventListener("storage", (evento) => {
  if (["cicsa_cursos", "cicsa_progreso"].includes(evento.key) || evento.key === null) {
    consultarHorariosActualizados();
  }
});

// Consulta cambios aunque el trabajador mantenga esta pagina abierta.
setInterval(consultarHorariosActualizados, 5000);
