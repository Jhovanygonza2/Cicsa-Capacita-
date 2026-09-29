// login.js — RF-002 (iniciar sesión), RF-003 (redirección según rol), RS-001

const form = document.getElementById("form-login");
const btn = document.getElementById("btn-login");
const errorGeneral = document.getElementById("error-general");
const bannerSesionActiva = document.getElementById("sesion-activa-banner");
const btnContinuarSesion = document.getElementById("btn-continuar-sesion");
const btnCerrarSesionLogin = document.getElementById("btn-cerrar-sesion-login");

function redirigirSegunRol() {
  const ruta = ["admin", "superadmin"].includes(sesion.rol()) ? "admin/dashboard.html" : "trabajador/inicio.html";
  window.location.href = ruta;
}

function limpiarSesionLocal() {
  enviarPulsoUso("cerrar", "cierre_manual");
  localStorage.removeItem("cicsa_token");
  localStorage.removeItem("cicsa_usuario");
  localStorage.removeItem("cicsa_ultima_actividad");
}

function mostrarError(mensaje) {
  if (!errorGeneral) return;
  errorGeneral.textContent = mensaje;
  errorGeneral.classList.remove("oculto");
}

function ocultarError() {
  if (!errorGeneral) return;
  errorGeneral.textContent = "";
  errorGeneral.classList.add("oculto");
}

function setBotonLogin(cargando) {
  if (!btn) return;
  const label = btn.querySelector(".btn-texto-login");
  btn.disabled = cargando;
  if (cargando) {
    btn.classList.add("is-loading");
    if (label) label.textContent = "Verificando…";
  } else {
    btn.classList.remove("is-loading");
    if (label) label.textContent = "Iniciar sesión";
  }
}

if (sesion.activa() && form) {
  form.classList.add("oculto");
  if (bannerSesionActiva) bannerSesionActiva.classList.remove("oculto");

  btnContinuarSesion?.addEventListener("click", () => redirigirSegunRol());
  btnCerrarSesionLogin?.addEventListener("click", () => {
    limpiarSesionLocal();
    window.location.reload();
  });
}

if (!form) {
  console.warn("No se encontró el formulario de login en esta página.");
} else {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btn?.disabled) return;
    ocultarError();

    const correo = document.getElementById("correo")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";

    let valido = true;
    marcarCampo("campo-correo", correo.length > 0);
    marcarCampo("campo-password", password.length > 0);

    if (correo.length === 0 || password.length === 0) {
      valido = false;
    }

    if (!valido) {
      mostrarError("Completa los campos requeridos antes de continuar.");
      return;
    }

    setBotonLogin(true);

    try {
      const { token, usuario } = await auth.login(correo, password);
      sesion.guardar(token, usuario);
      redirigirSegunRol();
    } catch (err) {
      mostrarError(err.message || "No se pudo iniciar sesión.");
      setBotonLogin(false);
    }
  });
}

function marcarCampo(id, ok) {
  const campo = document.getElementById(id);
  if (campo) campo.classList.toggle("con-error", !ok);
}
