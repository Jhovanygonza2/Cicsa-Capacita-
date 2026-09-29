# CICSA Capacita — Frontend

Frontend completo (HTML + CSS + JavaScript sin frameworks) para la plataforma
de capacitación de empleados. Construido desde cero con un sistema de diseño
propio, listo para conectarse al backend Node/Express/MySQL descrito en el
proyecto.

## Cómo verlo

No necesitas instalar nada. Basta con abrir `index.html` en el navegador,
o servirlo con un servidor estático simple:

```bash
cd frontend
python3 -m http.server 5500
# abre http://localhost:5500
```

> Si lo abres con doble clic (`file://...`) todo funciona igual, porque no
> depende de rutas absolutas ni de un backend corriendo: viene en **modo
> demo** con datos simulados (ver siguiente sección).

## Modo demo vs. backend real

Todo el tráfico de red pasa por `js/api.js`. Ahí mismo hay dos variables al
principio del archivo:

```js
const API_BASE = "http://localhost:4000/api"; // pon la URL real de tu API
const MOCK_MODE = true; // cámbialo a false cuando el backend esté listo
```

Mientras `MOCK_MODE` sea `true`, el frontend funciona por completo con datos
en memoria (usuarios, cursos, progreso, evaluaciones) para que puedas
mostrarlo o probarlo sin depender del backend. Cuando tu API de Express esté
corriendo, cambia `MOCK_MODE` a `false` y ajusta `API_BASE`: las funciones
públicas (`auth`, `usuarios`, `cursos`, `progreso`, `lecciones`,
`evaluaciones`, `reportes`) ya están escritas para llamar a los endpoints
reales con `fetch` y el token JWT en el header `Authorization`.

No se incluyen historiales de usuarios demo. Se configuran una sola vez las cuentas solicitadas: Jhovany (trabajador) y ana (administradora), con acceso por nombre de usuario o correo. Al actualizar, se eliminan una sola vez las seis cuentas demo originales y sus datos asociados del navegador. Se conservan las cuentas creadas manualmente. El acceso requiere una cuenta existente; la pantalla de inicio de sesión no permite registrar cuentas.

## Estructura

```
frontend/
├── index.html                 Login
├── recuperar.html              Recuperar / restablecer contraseña
├── admin/
│   └── dashboard.html          Panel admin: Usuarios · Cursos · Seguimiento (barra superior)
├── trabajador/
│   ├── dashboard.html          Mis cursos (tarjetas con menú de tres puntos)
│   ├── perfil.html             Perfil: banner + Insignias y certificados + Historia de aprendizaje
│   └── curso.html               Visor de curso (tema oscuro): esquema colapsable + lección + evaluación
├── css/
│   └── styles.css              Sistema de diseño (tokens, componentes, tema oscuro del visor)
└── js/
    ├── api.js                  Cliente de API + sesión + datos de demo
    ├── login.js
    ├── recuperar.js
    ├── menu-perfil.js          Controla el panel de perfil deslizable (drawer), compartido
    ├── admin-dashboard.js
    ├── worker-dashboard.js
    ├── perfil.js
    └── curso.js
```

## Endpoints que espera el backend

`js/api.js` ya está escrito contra este contrato; solo hace falta que el
backend Express los implemente con esas mismas rutas y formas de respuesta
(o edita las funciones en `api.js` si tus rutas ya tienen otros nombres):

| Método | Ruta | Uso |
|---|---|---|
| POST | `/auth/login` | `{correo, password}` → `{token, usuario}` |
| POST | `/auth/olvide-password` | `{correo}` |
| POST | `/auth/restablecer-password` | `{token, password}` |
| GET | `/usuarios` | listar (admin) |
| POST | `/usuarios` | crear |
| PATCH | `/usuarios/:id/estado` | `{activo}` activar/desactivar |
| GET | `/cursos` | listar |
| GET | `/cursos/:id` | detalle con módulos y lecciones |
| POST | `/cursos` | crear |
| PATCH | `/cursos/:id/estado` | `{estado}` publicar/despublicar |
| GET | `/progreso/mis-cursos` | cursos asignados + avance del usuario en sesión |
| POST | `/progreso/leccion/:id/completar` | marcar lección vista |
| GET | `/lecciones/:id` | contenido de una lección |
| GET | `/evaluaciones/curso/:id` | preguntas y calificación mínima |
| POST | `/evaluaciones/curso/:id/intento` | `{respuestas}` → `{nota, aprobado}` |
| GET | `/reportes/seguimiento` | resultados para el panel de seguimiento |

Todas las llamadas envían `Authorization: Bearer <token>` automáticamente
una vez que el usuario inicia sesión (`sesion.token()` en `api.js`).

## Trazabilidad con los requerimientos

| Requerimientos | Dónde vive en el frontend |
|---|---|
| RF-001, RF-005, RF-006 | `admin/dashboard.html` → vista Usuarios, `admin-dashboard.js` |
| RF-002, RF-003 | `index.html`, `login.js` (redirección según rol) |
| RF-004 | `recuperar.html`, `recuperar.js` |
| RF-007, RF-008, RS-007..011 | `sesion.requerir()` en `api.js`, usado al inicio de cada página protegida |
| RF-009..016 | `admin/dashboard.html` → vista Cursos |
| RF-017..022 | `trabajador/lector.html` (render de lección según `tipo`) |
| RF-023..029 | `trabajador/dashboard.html`, `lector.js` |
| RF-030..036 | `lector.js` → `mostrarEvaluacion()` / `mostrarResultadoEvaluacion()` |
| RF-039..044 | `admin/dashboard.html` → vista Seguimiento (filtros + exportar CSV) |
| RS-001, RS-005, RS-006 | `sesion.*` en `api.js` (token, cuenta inactiva, cierre por inactividad) |
| Responsivo | `media queries` al final de `css/styles.css` |

## Siguientes pasos sugeridos

- Conectar `MOCK_MODE = false` contra tu backend Express real.
- Agregar formularios de administración de contenido (subir video/documento)
  dentro de la vista Cursos, una vez que el backend tenga endpoints de carga
  de archivos.
- Conectar un servicio SMTP para enviar al administrador las solicitudes de
  `/auth/olvide-password`; en modo demo se registran en las notificaciones
  administrativas y se dirigen a `ana.torres@cicsa.mx`.

## Roles y aprobación
Administrador: altas y bajas de trabajadores e instructores, aprobación y asignación.
Instructor: crea y edita cursos y evaluaciones; los cambios requieren aprobación.
Trabajador: realiza sus cursos asignados.
Súper administrador: acceso completo, gestión de administradores y contraseñas.
En demo, Ana pasa una sola vez a súper administradora conservando su contraseña.
Los cursos nuevos quedan pendientes y sin asignación. Los existentes conservan su estado.
Se agrega PATCH /cursos/:id/asignacion con {asignadoA, asignadoAIds}.
El backend real debe aplicar la misma matriz en cada endpoint y revocar sesiones
de cuentas desactivadas. El almacenamiento local solo simula estas validaciones.

Validación de roles y persistencia: ejecutar node tests/roles.cjs desde la raíz del proyecto.

### Cuentas demo adicionales

| Usuario | Contraseña inicial | Rol |
|---|---|---|
| administrador | AdminDemo2026 | Administrador |
| instructor | Instructor2026 | Instructor |

Se agregan una sola vez al cargar la aplicación en modo demo, también en navegadores
que ya tenían cuentas. No se sobrescriben cuentas con el mismo correo o usuario.
Las contraseñas y bajas posteriores se conservan al recargar.

### Horario global del curso
La fecha de cierre se calcula como apertura + horas. El plazo es igual para todos
y no se reinicia al recargar o volver a iniciar sesión. Si no se indica apertura,
se establece al aprobar y publicar. Instructor y súper administrador editan la
duración y apertura; administrador y súper administrador aprueban y asignan.
Los cambios de contenido u horario requieren nueva aprobación.
Al vencer el plazo, el lector se bloquea y la API simulada rechaza contenido,
avance y respuestas de examen. El historial guardado se conserva.
Los cursos existentes adoptan esta regla sin reiniciar sus fechas de apertura.
El backend real deberá aplicar este cálculo con su reloj en cada solicitud.
Validación: node tests/horarios.cjs

### Repetición individual autorizada
Administrador y súper administrador pueden usar “Autorizar repetir curso” en el
perfil del trabajador. Instructor y trabajador no pueden autorizarla.
La nueva oportunidad comienza al autorizar, dura las horas del curso y reinicia
evaluación del curso, módulos y examen; conserva los intentos anteriores.
No modifica la apertura global ni el acceso de otros trabajadores.
Endpoint: POST /progreso/reabrir/:cursoId/:usuarioId. Requiere cuenta activa,
curso publicado y asignación vigente. El backend real deberá aplicar estos controles.

## Ayuda y soporte
Ayuda abre la guía de uso. Soporte abre trabajador/soporte.html para todos los roles.
POST /soporte crea solicitudes con identidad tomada de la sesión; GET /soporte
devuelve solo solicitudes propias o que el usuario puede atender; PATCH /soporte/:id
permite responder y cambiar el estado a personal autorizado.
Administrador atiende solicitudes generales de trabajadores e instructores.
Súper administrador atiende todas, incluidas contraseñas y cuentas administrativas.
La captura opcional admite PNG/JPG/WEBP hasta 2 MB. Resolver no cambia contraseñas
ni reabre cursos automáticamente: esas acciones mantienen sus controles propios.
En demo se utiliza cicsa_soporte en localStorage del mismo navegador.
El backend debe implementar estos endpoints y permisos para uso entre equipos.

Pruebas de privacidad y permisos de soporte: node tests/soporte.cjs.


### Historial de conexiones
Admin y súper administrador: **Actividad → Conexiones de trabajadores**.
Registra entrada, salida, duración y motivo; incluye búsqueda, paginación y actualización cada 30 segundos.
Solo registra trabajadores. Recargar o cambiar de página conserva la sesión.
El cierre manual y por inactividad se registra explícitamente. Tras más de 2 minutos sin pulso,
la salida se estima en la última señal recibida; no se inventa una hora exacta de cierre del navegador.
La duración mide sesión, no estudio. No se reconstruyen conexiones anteriores a esta función.
En demo todo queda en localStorage del mismo navegador/origen: ocultar el reporte y validar las
llamadas simuladas no protege frente a quien inspeccione el almacenamiento local.

Backend pendiente (MOCK_MODE=false): el login debe crear una sesión por token para trabajadores;
POST /sesiones/pulso actualiza su última señal y POST /sesiones/cerrar recibe {motivo}.
Ambos identifican al trabajador por el token, verifican cuenta activa y usan hora del servidor.
GET /reportes/sesiones devuelve [{id, usuarioId, nombre, entrada, ultimaSenal, salida, motivo, estimada}]
solo a admin/superadmin activos; debe rechazar trabajador/instructor con 403.
El servidor debe cerrar sesiones vencidas, revocadas y desactivadas, y guardar el historial en la base
de datos para compartirlo entre equipos. Los pulsos deben ser idempotentes para varias pestañas.


### Validación de consumo antes de avanzar
El lector exige el 100 % de los tramos únicos de video reproducidos con la pestaña visible.
Adelantar o repetir un mismo tramo no aumenta artificialmente la cobertura. Texto e imagen:
120 segundos visibles. Documento PDF: descarga iniciada tras obtener el archivo correctamente,
o 120 segundos de consulta en el visor. El navegador no permite confirmar que el usuario guardó
el archivo en disco ni que prestó atención. Una descarga fallida no habilita el avance.
Siguiente guarda la evidencia; el menú lateral no permite saltar unidades pendientes.
Los avances ya completados se conservan. Los contadores parciales se guardan localmente y se
separan por cuenta, contenido y fecha de apertura (incluida repetición autorizada).
Los umbrales están en REGLAS_CONSUMO de js/api.js.
POST /progreso/leccion/:id/completar recibe {evidencia:{segundos,tramos,duracion,descargado}}.
En demo se valida la regla del contenido, la evaluación del curso y las unidades anteriores.
En producción el backend debe validar también esos requisitos, usar duración de video confiable,
y registrar eventos/tiempos y descargas en el servidor: no debe confiar en evidencia enviada por
el cliente ni en localStorage. Esta versión es un control de avance del frontend, no prueba de atención.


## Flujo de aprobación de cursos del Instructor
- Al crear o actualizar un curso, el Instructor lo deja en estado pendiente y se genera una notificación exclusiva para el Súper administrador.
- El Súper administrador dispone de **Aprobar cursos** en su menú para revisar, comentar, aprobar/publicar o solicitar cambios.
- Al solicitar cambios, el comentario es obligatorio. El Instructor lo ve en **Mis solicitudes** y al editar/re-enviar el curso vuelve a generarse la notificación.
