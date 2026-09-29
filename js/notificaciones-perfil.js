// Notificaciones del perfil: mismas claves de descarte que Mi aprendizaje.
(() => {
const trabajadorActual = sesion.usuario();
let itemsCursos = [];
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



function formatoProgramacion(iso) { return iso ? new Date(iso).toLocaleString("es-MX", {dateStyle:"short",timeStyle:"short"}) : ""; }
function mostrarToast() { /* En el perfil los avisos se consultan desde la campana. */ }
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
  items.forEach(({curso, progreso: avance, asignado}) => {
    if (avance?.estado === "completado") {
      avisos.push({id: String(curso.id), tipo: "completado", icono: iconoAviso("completado"), etiqueta: "Curso completado", nombre: curso.nombre, mensaje: "Terminaste este curso. Consulta tu logro en tu perfil."});
    } else if (curso.fechaFin && ahora >= new Date(curso.fechaFin)) {
      avisos.push({id: `cerrado-${curso.id}-${curso.fechaFin}`, tipo: "cerrado", icono: iconoAviso("cerrado"), etiqueta: "Curso cerrado", nombre: curso.nombre, mensaje: `El periodo de este curso terminó el ${formatoProgramacion(curso.fechaFin)}.`});
    } else if (curso.fechaInicio && ahora < new Date(curso.fechaInicio)) {
      if (asignado === true) avisos.push({id: `inicio-${curso.id}-${curso.fechaInicio}`, tipo: "programado", icono: iconoAviso("programado"), etiqueta: "Próxima apertura", nombre: curso.nombre, mensaje: `Tienes este curso asignado. Estará disponible a partir del ${formatoProgramacion(curso.fechaInicio)}.`});
      else avisos.push({id: `nuevo-programado-${curso.id}-${curso.fechaInicio}`, tipo: "programado", icono: iconoAviso("programado"), etiqueta: "Próximo curso", nombre: curso.nombre, mensaje: `Este curso se publicará próximamente (${formatoProgramacion(curso.fechaInicio)}).`});
    } else {
      const estado = avance?.estado || "no_iniciado";
      if (asignado === true) {
        if (estado !== "completado") {
          avisos.push({id: `pendiente-${curso.id}`, tipo: "abierto", icono: iconoAviso("abierto"), etiqueta: estado === "en_proceso" || estado === "listo_examen" ? "Curso pendiente" : "Curso asignado", nombre: curso.nombre, mensaje: estado === "en_proceso" ? "Tienes este curso en proceso. Continúa para completarlo." : estado === "listo_examen" ? "Terminaste el contenido; tienes pendiente presentar el examen." : "Este curso está asignado a tu cuenta y está pendiente de completar."});
        }
      } else {
        avisos.push({id: `nuevo-disponible-${curso.id}`, tipo: "abierto", icono: iconoAviso("abierto"), etiqueta: "Nuevo curso disponible", nombre: curso.nombre, mensaje: "Este curso ya está publicado. Si no aparece como asignado, consulta con el administrador."});
      }
      if (asignado === true && curso.fechaFin) {
        const restante = new Date(curso.fechaFin).getTime() - ahora.getTime();
        if (restante > 0 && restante <= 7 * 24 * 60 * 60 * 1000 && estado !== "completado") {
          avisos.push({id: `vence-pronto-${curso.id}-${curso.fechaFin}`, tipo: "cerrado", icono: iconoAviso("cerrado"), etiqueta: "Recordatorio de vencimiento", nombre: curso.nombre, mensaje: `El curso vence el ${formatoProgramacion(curso.fechaFin)}. Completa lo pendiente antes de esa fecha.`});
        }
      }
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


const modal = document.getElementById("modal-notificaciones");
const boton = document.getElementById("btn-notificaciones");
let consultaEnCurso = false;
async function refrescar() {
  if (consultaEnCurso || !sesion.activa()) return;
  consultaEnCurso = true;
  const estado = document.getElementById("notificaciones-estado");
  estado.textContent = "Actualizando avisos…";
  try {
    const items = await progreso.misCursos();
    window.notificacionesPerfil.actualizar(items);
    document.getElementById("notificaciones-error").textContent = "";
    estado.textContent = "Avisos actualizados.";
  } catch (error) {
    document.getElementById("notificaciones-error").textContent = "No se pudieron actualizar los avisos. Cierra y vuelve a abrir las notificaciones para reintentar.";
    estado.textContent = "";
  } finally { consultaEnCurso = false; }
}
window.notificacionesPerfil = {
  actualizar(items) {
    itemsCursos = items;
    actualizarNotificaciones(items);
    if (!modal.classList.contains("oculto")) pintarNotificacionesTrabajador();
  }
};
boton.addEventListener("click", () => { abrirModalNotificaciones(); refrescar(); });
modal.querySelector(".modal-notificaciones-close").addEventListener("click", cerrarModalNotificaciones);
modal.addEventListener("click", e => { if (e.target === modal) cerrarModalNotificaciones(); });
document.getElementById("lista-notificaciones").addEventListener("click", e => {
  const boton = e.target.closest("[data-notificacion-id]");
  if (boton) descartarNotificaciones([boton.dataset.notificacionId]);
});
document.getElementById("btn-quitar-todas-notificaciones").addEventListener("click", () =>
  descartarNotificaciones(obtenerNotificacionesTrabajador(itemsCursos).map(n => n.id)));
document.addEventListener("keydown", e => {
  if (modal.classList.contains("oculto")) return;
  if (e.key === "Escape") { cerrarModalNotificaciones(); return; }
  if (e.key !== "Tab") return;
  const controles = [...modal.querySelectorAll("button")].filter(b => !b.hidden && !b.disabled && b.getClientRects().length);
  const primero = controles[0], ultimo = controles[controles.length - 1];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
});
window.addEventListener("storage", e => {
  if (e.key === claveNotificaciones || e.key === null) {
    try {
      const ids = JSON.parse(localStorage.getItem(claveNotificaciones) || "[]");
      notificacionesEliminadas = new Set(Array.isArray(ids) ? ids.map(String) : []);
      window.notificacionesPerfil.actualizar(itemsCursos);
    } catch {}
  }
});
setInterval(() => { if (!modal.classList.contains("oculto") && !document.hidden) refrescar(); }, 30000);
})();
