// estado-utilidades.js — Estado global del panel y utilidades compartidas (fechas, formato, toasts, paginación, archivos)
// RF-001,005..008,009..016,030..036,039..044

if (sesion.activa() && sesion.rol() === "instructor") {
  window.location.replace("../instructor/cursos.html");
  throw new Error("Redirigiendo al módulo del Instructor.");
}
if (!sesion.requerir(["admin", "superadmin"])) {
  throw new Error("Acceso exclusivo de Administración.");
}
sesion.vigilarInactividad(20);

const adminActual = sesion.usuario();
const bienvenidaAdmin = document.getElementById("bienvenida-admin");
if (bienvenidaAdmin && adminActual?.nombre) {
  bienvenidaAdmin.textContent = `Bienvenido, ${adminActual.nombre.split(" ")[0]}`;
}

document.getElementById("btn-cerrar-sesion").addEventListener("click", () => sesion.cerrar());

// ---------------------------------------------------------------
// Utilidades de fecha / actividad
// ---------------------------------------------------------------
function formatoFecha(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX") + ", " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function tiempoDesde(iso) {
  if (!iso) return "Nunca";
  const ms = Date.now() - new Date(iso).getTime();
  const horas = ms / 3600000;
  if (horas < 1) return "Hace unos minutos";
  if (horas < 24) return `Hace ${Math.floor(horas)} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias === 1 ? "" : "s"}`;
}

/** activo: acceso hace <48h · inactivo: acceso hace >=48h · nunca: jamás inició sesión */
function estadoActividad(u) {
  if (!u.ultimoAcceso) return "nunca";
  const horas = (Date.now() - new Date(u.ultimoAcceso).getTime()) / 3600000;
  return horas < 48 ? "activo" : "inactivo";
}

function badgeActividad(estado) {
  if (estado === "activo") return '<span class="punto-estado verde"></span>Activo';
  if (estado === "inactivo") return '<span class="punto-estado naranja"></span>Sin actividad';
  return '<span class="punto-estado gris"></span>Nunca inició sesión';
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------
// Estado en memoria
// ---------------------------------------------------------------
let listaUsuarios = [];
let listaCursos = [];
let listaSolicitudes = [];
let listaSeguimiento = [];
let listaNotificaciones = [];
let listaResultados = [];
const estadoDashboard = {
  actividad: { pagina: 1, porPagina: 8 },
  usuarios: { pagina: 1, porPagina: 8 },
};
let cursoEnEdicionId = null;
let examenPendiente = null;
let evaluacionPendiente = null;

function mostrarToastAdmin(mensaje, tipo = "info") {
  const contenedor = document.getElementById("admin-toast-container");
  if (!contenedor) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function confirmarAdmin(mensaje) {
  return new Promise((resolver) => {
    const modal = document.createElement("div");
    modal.className = "admin-confirm-backdrop";
    modal.innerHTML = `
      <div class="admin-confirm" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-titulo">
        <h3 id="admin-confirm-titulo"></h3>
        <div class="admin-confirm-acciones">
          <button type="button" class="btn btn-secundario" data-confirmar-cancelar>Cancelar</button>
          <button type="button" class="btn btn-peligro" data-confirmar-aceptar>Continuar</button>
        </div>
      </div>`;
    modal.querySelector("h3").textContent = mensaje;
    const focoAnterior = document.activeElement;
    const teclado = (evento) => {
      if (evento.key === "Escape") { evento.preventDefault(); cerrar(false); }
      if (evento.key === "Tab") {
        const botones = [...modal.querySelectorAll("button")];
        const destino = evento.shiftKey ? botones[0] : botones[botones.length - 1];
        if (document.activeElement === destino) { evento.preventDefault(); (evento.shiftKey ? botones[botones.length - 1] : botones[0]).focus(); }
      }
    };
    const cerrar = (resultado) => {
      document.removeEventListener("keydown", teclado);
      modal.remove();
      if (focoAnterior?.isConnected) focoAnterior.focus();
      resolver(resultado);
    };
    document.addEventListener("keydown", teclado);
    modal.querySelector("[data-confirmar-cancelar]").addEventListener("click", () => cerrar(false));
    modal.querySelector("[data-confirmar-aceptar]").addEventListener("click", () => cerrar(true));
    document.body.appendChild(modal);
    modal.querySelector("[data-confirmar-cancelar]").focus();
  });
}

function pintarPaginacion(id, total, estado, pintar) {
  const contenedor = document.getElementById(id);
  if (!contenedor) return;
  const paginas = Math.max(1, Math.ceil(total / estado.porPagina));
  estado.pagina = Math.min(estado.pagina, paginas);
  contenedor.replaceChildren();
  if (paginas <= 1) return;
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = pagina;
    boton.classList.toggle("activo", pagina === estado.pagina);
    boton.setAttribute("aria-label", `Página ${pagina}`);
    boton.addEventListener("click", () => {
      estado.pagina = pagina;
      pintar();
    });
    contenedor.appendChild(boton);
  }
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

// Una sola operación por control, con restauración ante fallos.
async function ejecutarAccionAdmin(control, accion) {
  if (control.disabled) return;
  control.disabled = true;
  control.setAttribute("aria-busy", "true");
  try { await accion(); }
  catch (error) { mostrarToastAdmin(error.message || "No se pudo completar la acción. Intenta de nuevo.", "error"); }
  finally { control.disabled = false; control.removeAttribute("aria-busy"); }
}
