// perfil.js — RF-023..029 (historial) + insignias/certificados como refuerzo motivacional

sesion.requerir(["trabajador"]);
sesion.vigilarInactividad(20);

const usuarioActual = sesion.usuario();

document.querySelector(".help-btn")?.addEventListener("click", () => { window.location.href = "tutorial.html"; });

function iniciales(nombre) {
  return nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function pintarIdentidad() {
  if (!usuarioActual) return;
  const ini = iniciales(usuarioActual.nombre);
  document.getElementById("nombre-perfil").textContent = usuarioActual.nombre;
  document.getElementById("correo-perfil").textContent = usuarioActual.correo || "";
  document.getElementById("avatar-perfil").textContent = ini;
}

// ---------------------------------------------------------------
// Navegación por pestañas (navbar superior: Insignias / Historial)
// ---------------------------------------------------------------
document.querySelectorAll(".tabs-navbar .item-nav").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".tabs-navbar .item-nav").forEach((l) => l.classList.remove("activo"));
    link.classList.add("activo");
    document.querySelectorAll(".vista").forEach((v) => v.classList.add("oculto"));
    document.getElementById("vista-" + link.dataset.vista).classList.remove("oculto");
    history.replaceState(null, "", `#${link.dataset.vista}`);
  });
});

const parametroTab = new URLSearchParams(window.location.search).get("tab");
const hashTab = window.location.hash.replace("#", "");
if (parametroTab === "historial" || hashTab === "historial") {
  document.querySelector('.tabs-navbar .item-nav[data-vista="historial"]')?.click();
}

// ---------------------------------------------------------------
// Datos: insignias, certificados e historial de aprendizaje
// ---------------------------------------------------------------
async function cargarPerfil() {
  const [items, resultados] = await Promise.all([
    progreso.misCursos(),
    // Mantiene el perfil operativo mientras el backend real incorpora este reporte.
    reportes.misResultados().catch(() => []),
  ]);
  window.notificacionesPerfil.actualizar(items);
  const completados = items.filter((i) => i.progreso.estado === "completado");
  const promedioProgreso = items.length
    ? Math.round(items.reduce((acc, i) => acc + i.progreso.porcentaje, 0) / items.length)
    : 0;

  document.getElementById("metrica-certificados").textContent = completados.length;
  document.getElementById("metrica-insignias").textContent = completados.length;
  document.getElementById("metrica-progreso").textContent = `${promedioProgreso}%`;

  document.getElementById("nombre-historial").textContent = usuarioActual.nombre;
  document.getElementById("avatar-historial").textContent = iniciales(usuarioActual.nombre);
  document.getElementById("meta-insignias-historial").textContent = completados.length;
  document.getElementById("meta-cursos-historial").textContent = completados.length;

  pintarPanelDesempeno(resultados);

  const contenedorInsignias = document.getElementById("contenedor-insignias");
  contenedorInsignias.innerHTML = completados.length
    ? completados.map((i) => `
        <div class="tarjeta" style="text-align: center; padding: var(--gap-lg);">
          <div style="margin-bottom: var(--gap-md); color: #8b5cf6; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 42px; height: 42px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round;">
              <path d="M8 4.5h8a2 2 0 0 1 2 2V8l-2 1.2V7H8v2.2L6 8V6.5a2 2 0 0 1 2-2Z"></path>
              <path d="M12 9.5 13.9 13l3.8.6-2.8 2.7 0.7 3.7-3.6-1.9-3.6 1.9.7-3.7-2.8-2.7 3.8-.6L12 9.5Z"></path>
            </svg>
          </div>
          <p style="font-size: 12px; font-weight: 600; margin: 0;">${i.curso.nombre}</p>
        </div>
      `).join("")
    : `<div class="tarjeta" style="text-align: center; padding: var(--gap-lg);">
        <div class="icono-estado-vacio" style="margin-bottom: var(--gap-md); color: #8b5cf6;">
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 26px; height: 26px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round;">
            <path d="M8 4.5h8a2 2 0 0 1 2 2V8l-2 1.2V7H8v2.2L6 8V6.5a2 2 0 0 1 2-2Z"></path>
            <path d="M12 9.5 13.9 13l3.8.6-2.8 2.7 0.7 3.7-3.6-1.9-3.6 1.9.7-3.7-2.8-2.7 3.8-.6L12 9.5Z"></path>
          </svg>
        </div>
        <p style="font-size: 12px; font-weight: 600;">No hay insignias aún</p>
      </div>`;

  const contenedorCertificados = document.getElementById("contenedor-certificados");
  contenedorCertificados.innerHTML = completados.length
    ? completados.map((i) => `
        <div class="tarjeta" style="display: flex; align-items: center; justify-content: space-between; gap: var(--gap-md);">
          <div>
            <p style="font-weight: 600; margin: 0 0 4px;">${i.curso.nombre}</p>
            <p class="muted" style="margin: 0; font-size: 12px;">Certificado de finalización</p>
          </div>
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 24px; height: 24px; stroke: var(--gris-suave); stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round;">
            <path d="M7 4.5h10a1 1 0 0 1 1 1V18l-2.8-2.2L12 18l-3.2-2.7L6 18V5.5a1 1 0 0 1 1-1Z"></path>
            <path d="M9 8.5h6M9 11.5h6"></path>
          </svg>
        </div>
      `).join("")
    : `<div class="tarjeta"><p class="muted" style="text-align: center;">No hay certificados aún. Completa un curso para obtener uno.</p></div>`;

  const contenedorHistorial = document.getElementById("contenedor-historial");
  const filtroEstado = document.getElementById("filtro-historial-estado");
  const filtroOrden = document.getElementById("filtro-historial-orden");
  const buscador = document.getElementById("buscar-historial");

  function obtenerItemsFiltrados() {
    let lista = [...items];
    const texto = buscador?.value.trim().toLowerCase() || "";
    const estado = filtroEstado?.value || "";

    if (texto) {
      lista = lista.filter((i) => i.curso.nombre.toLowerCase().includes(texto));
    }

    if (estado) {
      lista = lista.filter((i) => i.progreso.estado === estado);
    }

    if (filtroOrden?.value === "antiguo") {
      lista.sort((a, b) => (a.curso.fechaInicio || "").localeCompare(b.curso.fechaInicio || ""));
    } else if (filtroOrden?.value === "nombre") {
      lista.sort((a, b) => a.curso.nombre.localeCompare(b.curso.nombre));
    } else {
      lista.sort((a, b) => (b.progreso.fechaFin || b.progreso.fechaInicio || "").localeCompare(a.progreso.fechaFin || a.progreso.fechaInicio || ""));
    }

    return lista;
  }

  function renderHistorial() {
    const lista = obtenerItemsFiltrados();
    contenedorHistorial.innerHTML = lista.length
      ? lista.map((i) => `
          <div class="historial-item">
            <div class="historial-item-curso">
              <div class="historial-item-imagen"><svg class="perfil-icono-lineal" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Zm9 3a3 3 0 0 1 3-3h4v15h-3a4 4 0 0 0-4 2"/><path d="M7 8h3M7 12h3"/></svg></div>
              <div class="historial-item-info">
                <strong>${i.curso.nombre}</strong>
                <div class="historial-item-meta">
                  <span>${i.curso.categoria || "General"}</span>
                  <span>•</span>
                  <span>${i.curso.duracion || "Sin duración"}</span>
                </div>
              </div>
            </div>
            <div class="historial-col">
              <span>Fecha de inicio del curso</span>
              <strong>${formatearFechaInicioCurso(i.curso.fechaInicio)}</strong>
            </div>
            <div class="historial-col">
              <span>Fecha de finalización del curso</span>
              <strong>${i.progreso.fechaFin || "—"}</strong>
            </div>
            <div class="historial-col">
              <span>Fecha de finalización</span>
              <strong>${i.progreso.fechaFin || "—"}</strong>
            </div>
            <div class="historial-col" style="align-items:flex-end;">
              <span>Estado de finalización</span>
              <span class="historial-estado ${i.progreso.estado}">${i.progreso.estado === "completado" ? "Completado" : i.progreso.estado === "listo_examen" ? "Pendiente de examen" : i.progreso.estado === "en_proceso" ? "En proceso" : "No iniciado"}</span>
            </div>
          </div>
        `).join("")
      : `<div class="tarjeta"><p class="muted" style="text-align: center;">No se encontraron resultados.</p></div>`;
  }

  buscador?.addEventListener("input", renderHistorial);
  filtroEstado?.addEventListener("change", renderHistorial);
  filtroOrden?.addEventListener("change", renderHistorial);

  renderHistorial();
}

function pintarPanelDesempeno(resultados) {
  const panel = document.getElementById("panel-desempeno");
  const notas = resultados.map((resultado) => Number(resultado.nota)).filter(Number.isFinite);
  if (!panel || !notas.length) return;

  const promedio = Math.round(notas.reduce((suma, nota) => suma + nota, 0) / notas.length);
  const titulo = document.getElementById("panel-desempeno-titulo");
  const mensaje = document.getElementById("panel-desempeno-mensaje");
  const etiqueta = document.getElementById("panel-desempeno-etiqueta");
  const icono = document.getElementById("panel-desempeno-icono");
  panel.hidden = false;
  panel.classList.remove("desempeno-excelente", "desempeno-en-progreso", "desempeno-impulso");
  document.getElementById("panel-desempeno-promedio").textContent = `${promedio}%`;

  if (promedio >= 90) {
    panel.classList.add("desempeno-excelente");
    etiqueta.textContent = "Reconocimiento";
    icono.textContent = "★";
    titulo.textContent = "¡Excelente trabajo!";
    mensaje.textContent = `Tu promedio es ${promedio}%. Sigue así: tu dedicación está dando grandes resultados.`;
  } else if (promedio >= 70) {
    panel.classList.add("desempeno-en-progreso");
    etiqueta.textContent = "Vas muy bien";
    icono.textContent = "↗";
    titulo.textContent = "Tu avance está creciendo";
    mensaje.textContent = `Llevas un promedio de ${promedio}%. Continúa practicando para alcanzar el nivel de excelencia.`;
  } else {
    panel.classList.add("desempeno-impulso");
    etiqueta.textContent = "Sigue adelante";
    icono.textContent = "✦";
    titulo.textContent = "Cada intento te acerca a tu meta";
    mensaje.textContent = `Tu promedio actual es ${promedio}%. Repasa el contenido y vuelve a intentarlo: puedes lograrlo.`;
  }
}

if (sesion.activa() && sesion.rol() === "trabajador") {
  pintarIdentidad();
  cargarPerfil().catch((error) => {
    const aviso = document.createElement("p");
    aviso.setAttribute("role", "alert");
    aviso.textContent = error.message || "No se pudo cargar tu perfil. Recarga la página para reintentar.";
    document.querySelector(".app-main-panel")?.prepend(aviso);
  });
}
