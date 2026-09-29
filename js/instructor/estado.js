// Estado exclusivo del módulo de cursos del Instructor.
if (!sesion.activa()) {
  sesion.requerir(["instructor"]);
  throw new Error("Sesión no disponible.");
}
if (sesion.rol() !== "instructor") {
  window.location.replace(["admin", "superadmin"].includes(sesion.rol()) ? "../admin/dashboard.html" : "../trabajador/inicio.html");
  throw new Error("Acceso exclusivo para Instructor.");
}
sesion.vigilarInactividad(20);

const instructorActual = sesion.usuario();
const nombreInstructorTop = document.getElementById("nombre-admin-top");
if (nombreInstructorTop) nombreInstructorTop.textContent = instructorActual?.nombre || "Instructor";
const bienvenidaInstructor = document.getElementById("bienvenida-admin");
if (bienvenidaInstructor && instructorActual?.nombre) {
  bienvenidaInstructor.textContent = `Cursos de ${String(instructorActual.nombre).split(/\s+/)[0]}`;
}
document.getElementById("btn-cerrar-sesion")?.addEventListener("click", () => sesion.cerrar());

let listaUsuarios = [];
let listaCursos = [];
let cursoEnEdicionId = null;
let examenPendiente = null;
let evaluacionPendiente = null;

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatoFecha(iso) {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-MX") + ", " + fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function leerArchivoComoDataUrl(archivo, maximoMb) {
  if (!archivo) return Promise.resolve("");
  if (archivo.size > maximoMb * 1024 * 1024) {
    return Promise.reject(new Error(`El archivo debe pesar menos de ${maximoMb} MB.`));
  }
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error(`No se pudo leer ${archivo.name}.`));
    lector.readAsDataURL(archivo);
  });
}

function mostrarToastAdmin(mensaje, tipo = "info") {
  const contenedor = document.getElementById("admin-toast-container");
  if (!contenedor) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

async function ejecutarAccionAdmin(control, accion) {
  if (!control || control.disabled) return;
  control.disabled = true;
  control.setAttribute("aria-busy", "true");
  try {
    await accion();
  } catch (error) {
    mostrarToastAdmin(error?.message || "No se pudo completar la acción.", "error");
  } finally {
    control.disabled = false;
    control.removeAttribute("aria-busy");
  }
}
