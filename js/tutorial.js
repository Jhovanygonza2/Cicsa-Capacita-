// Guía del trabajador y materiales publicados por administración.
const accesoTutorial = sesion.requerir(["trabajador", "instructor", "admin", "superadmin"]);
const lista = document.getElementById("tutorial-lista");
const totalTutorial = document.getElementById("tutorial-total");
function escapar(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function iconoMaterial(tipo) {
  const trazos = {
    video: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 8 6 4-6 4V8Z"/>',
    pdf: '<path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6M9 16h4"/>',
    enlace: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 -1) scale(.9)"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (trazos[tipo] || trazos.pdf) + '</svg>';
}
function urlMaterial(t) {
  try {
    const url = new URL(t.url || "", window.location.href);
    if (!t.url) return "";
    if (["https:", "http:"].includes(url.protocol)) return url.href;
    if (url.protocol === "file:" && window.location.protocol === "file:" && !/^[a-z]+:/i.test(t.url)) return url.href;
    if (url.protocol === "data:" && ((t.tipo === "video" && /^data:video\//i.test(t.url)) || (t.tipo === "pdf" && /^data:application\/pdf[;,]/i.test(t.url)))) return url.href;
  } catch {}
  return "";
}
function cargar() {
  try {
    const guardados = tutoriales.listar();
    if (!Array.isArray(guardados)) throw new Error("Formato no válido");
    const items = guardados.filter(t => t && typeof t === "object" && t.tipo === "pdf");
    totalTutorial.textContent = items.length + (items.length === 1 ? " material" : " materiales");
    lista.innerHTML = items.length ? items.map(t => {
      const url = urlMaterial(t);
      const tipo = {video:"Video",pdf:"Documento PDF",enlace:"Enlace"}[t.tipo] || "Recurso";
      const contenido = !url ? '<p class="muted">Este recurso no está disponible. Consulta al administrador.</p>'
        : t.tipo === "video" ? '<video controls preload="metadata" aria-label="' + escapar(t.titulo || "Video tutorial") + '" src="' + escapar(url) + '"></video>'
        : '<a class="tutorial-recurso-enlace" target="_blank" rel="noopener noreferrer" href="' + escapar(url) + '">' + (t.tipo === "pdf" ? "Abrir documento" : "Consultar recurso") + ' <span aria-hidden="true">↗</span><span class="tutorial-sr"> (abre en otra pestaña)</span></a>';
      return '<article class="tutorial-item"><div class="tutorial-recurso-tipo"><span class="tutorial-recurso-icono">' + iconoMaterial(t.tipo) + '</span><span>' + tipo + '</span></div><h3>' + escapar(t.titulo || "Material de apoyo") + '</h3>' + (t.descripcion ? '<p>' + escapar(t.descripcion) + '</p>' : '') + contenido + '</article>';
    }).join("") : '<div class="tutorial-sin-materiales"><span class="tutorial-vacio-icono">' + iconoMaterial("pdf") + '</span><div><h3>Los materiales estarán disponibles aquí</h3><p>Administración aún no ha publicado recursos. Mientras tanto, puedes consultar los pasos de esta guía.</p></div></div>';
  } catch {
    totalTutorial.textContent = "No disponible";
    lista.innerHTML = '<div class="tutorial-sin-materiales" role="alert"><div><h3>No se pudieron cargar los materiales</h3><p>Intenta actualizar la lista nuevamente.</p><button class="btn btn-secundario" id="tutorial-reintentar" type="button">Reintentar</button></div></div>';
    document.getElementById("tutorial-reintentar").addEventListener("click", cargar);
  } finally {
    lista.setAttribute("aria-busy", "false");
  }
}
if (accesoTutorial) {
  sesion.vigilarInactividad(20);
  cargar();
  if (sesion.rol() !== "trabajador") {
    const volver = document.querySelector(".tutorial-volver");
    volver.href = "../admin/dashboard.html";
    volver.querySelector("span").textContent = "Volver al panel";
    document.querySelectorAll('a[href="dashboard.html"]').forEach(a => {
      a.href = "../admin/dashboard.html";
      a.textContent = "Volver a administración";
    });
  }
  if (sesion.rol() === "instructor") {
    const volver = document.querySelector(".tutorial-volver");
    volver.href = "inicio.html";
    volver.querySelector("span").textContent = "Volver a Inicio";
    const ruta = document.querySelector(".tutorial-ruta a");
    ruta.href = "inicio.html";
    ruta.textContent = "Inicio";
    const cursos = document.querySelector('.tutorial-pie > a');
    cursos.href = "../instructor/cursos.html#cursos-instructor";
    cursos.textContent = "Volver a Cursos";
  }
  window.addEventListener("cicsa-tutoriales-actualizados", cargar);
  window.addEventListener("focus", cargar);
  window.addEventListener("pageshow", cargar);
  window.addEventListener("storage", e => { if (e.key === "cicsa_tutoriales" || e.key === null) cargar(); });
}
