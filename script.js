/* PlanUCV - script principal */

const $ = id => document.getElementById(id);
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const COLORES = ["", "green", "pink", "orange", "blue"];
const FOTOS_UCV = ["imagenes/ucv-1.jpg", "imagenes/ucv-2.jpg", "imagenes/ucv-3.jpg"];
const PASOS = [
    ["cursos", "Agrega tus materias en Horarios"],
    ["notas", "Registra tus notas en Recomendaciones"],
    ["perfil", "Guarda tu perfil"],
    ["horario", "Genera tu primer horario"],
    ["recomendaciones", "Revisa tus recomendaciones"]
];
const PROGRESO_INICIAL = { cursos: false, notas: false, perfil: false, horario: false, recomendaciones: false };

/* ===== DATOS POR USUARIO ===== */

let USER_KEY = "invitado";
let cursos = [], notas = [], perfil = {}, progreso = { ...PROGRESO_INICIAL };

const k = nombre => `planUCV_${USER_KEY}_${nombre}`;

function leer(nombre, defecto) {
    try { return JSON.parse(localStorage.getItem(k(nombre))) ?? defecto; }
    catch { return defecto; }
}

function guardar(nombre, valor) {
    if (USER_KEY === "invitado") return;
    try { localStorage.setItem(k(nombre), typeof valor === "string" ? valor : JSON.stringify(valor)); }
    catch { mostrarToast("No se pudo guardar: el almacenamiento está lleno."); }
}

function cargarDatosUsuario(uid) {
    USER_KEY = uid;
    cursos = leer("cursos", []);
    notas = leer("notas", []);
    perfil = leer("perfil", {});
    progreso = { ...PROGRESO_INICIAL, ...leer("progreso", {}) };
    mostrarCursos();
    mostrarNotas();
    cargarPerfil();
    actualizarRecomendaciones();
    actualizarProgreso();
}

function escaparHTML(t) {
    return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ===== SESIÓN (la autenticación está en auth.js) ===== */

function mostrarLogin() { document.body.classList.add("login-active"); }
function mostrarAplicacion() { document.body.classList.remove("login-active"); actualizarProgreso(); }

function mostrarToastLogin(mensaje) {
    const el = $("loginMessage");
    if (el) { el.textContent = mensaje; el.classList.add("show"); }
}

function mostrarToast(mensaje) {
    $("toastMessage").textContent = mensaje;
    $("toast").classList.add("show");
    clearTimeout(mostrarToast.t);
    mostrarToast.t = setTimeout(() => $("toast").classList.remove("show"), 2800);
}

/* ===== PROGRESO ===== */

function marcar(paso) {
    if (progreso[paso]) return;
    progreso[paso] = true;
    actualizarProgreso();
}

function actualizarProgreso() {
    const hechos = PASOS.filter(([c]) => progreso[c]).length;
    const pct = hechos * 20;
    guardar("progreso", progreso);
    $("profileProgress").style.width = pct + "%";
    $("progressText").textContent = pct + "% perfil completado";
    $("notificationDot").style.display = hechos === PASOS.length ? "none" : "";
}

/* ===== NAVEGACIÓN ===== */

function goToSection(nombre) {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.section === nombre));
    document.querySelectorAll(".section").forEach(s => s.classList.toggle("active-section", s.id === nombre));
    if (nombre === "recomendaciones") marcar("recomendaciones");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function irATab(nombre) {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === nombre));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.id === nombre + "Tab"));
}

function configurarNavegacion() {
    document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => goToSection(b.dataset.section)));
    document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => irATab(t.dataset.tab)));

    $("userMenuButton").addEventListener("click", e => { e.stopPropagation(); $("userMenu").classList.toggle("show"); });
    $("notificationButton").addEventListener("click", e => {
        e.stopPropagation();
        const pendientes = PASOS.filter(([c]) => !progreso[c]);
        $("notificationPanel").innerHTML = "<h3>Notificaciones</h3>" + (pendientes.length
            ? pendientes.map(([, t]) => `<div class="notification-item"><strong>${t}</strong></div>`).join("")
            : "<p>Todo al día: completaste tu perfil académico.</p>");
        $("notificationPanel").classList.toggle("show");
    });

    document.addEventListener("click", e => {
        if (!$("notificationPanel").contains(e.target)) $("notificationPanel").classList.remove("show");
        $("userMenu").classList.remove("show");
        if (e.target.classList.contains("modal")) e.target.classList.remove("show");
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show"));
    });

    $("globalSearch").addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        const t = e.target.value.trim().toLowerCase();
        if (!t) return;
        if (/libro/.test(t)) { goToSection("recomendaciones"); irATab("libros"); }
        else if (/revista|articulo|artículo/.test(t)) { goToSection("recomendaciones"); irATab("revistas"); }
        else if (/curso|materia|horario/.test(t)) goToSection("horarios");
        else if (/nota/.test(t)) goToSection("recomendaciones");
        else { goToSection("apoyo"); $("academicSearch").value = e.target.value; buscarTemaAcademico(); }
    });

    [["bookSearch", () => buscarLibros()], ["articleSearch", () => buscarArticulos()], ["academicSearch", () => buscarTemaAcademico()]]
        .forEach(([id, fn]) => $(id).addEventListener("keydown", e => { if (e.key === "Enter") fn(); }));

    $("academicResults").addEventListener("click", e => {
        const card = e.target.closest(".topic-card");
        if (card) seleccionarTema(card.dataset.tema);
    });
}

/* ===== TEMA CLARO / OSCURO ===== */

function aplicarTema(oscuro) {
    document.body.classList.toggle("dark", oscuro);
    localStorage.setItem("planUCV_tema", oscuro ? "oscuro" : "claro");
    document.querySelectorAll(".theme-toggle").forEach(b => b.textContent = oscuro ? "☀️" : "🌙");
}

function configurarTema() {
    const g = localStorage.getItem("planUCV_tema");
    aplicarTema(g ? g === "oscuro" : matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelectorAll(".theme-toggle").forEach(b =>
        b.addEventListener("click", () => aplicarTema(!document.body.classList.contains("dark"))));
}

/* ===== CARRUSEL DE FOTOS ===== */

function crearCarrusel(selector, imagenes, ms = 5000) {
    const cont = document.querySelector(selector);
    if (!cont) return;
    const capas = imagenes.map((src, i) => {
        const d = document.createElement("div");
        d.className = "slide" + (i === 0 ? " on" : "");
        d.style.backgroundImage = `url("${src}")`;
        cont.prepend(d);
        return d;
    });
    let actual = 0;
    setInterval(() => {
        capas[actual].classList.remove("on");
        actual = (actual + 1) % capas.length;
        capas[actual].classList.add("on");
    }, ms);
}

/* ===== RECOMENDACIONES ===== */

const MATERIAS = [
    ["Inteligencia Artificial", "Explora fundamentos y aplicaciones de la IA.", "ia", "🤖", 96],
    ["Programación", "Fortalece tus habilidades para desarrollar software.", "programacion", "💻", 94],
    ["Ciencia de Datos", "Aprende a analizar información y encontrar patrones.", "datos", "📊", 91],
    ["Desarrollo Web", "Construye sitios y aplicaciones web modernas.", "diseno", "🌐", 88],
    ["Tecnología", "Descubre nuevas herramientas y tendencias.", "tecnologia", "⚙️", 86],
    ["Diseño de Interfaces", "Mejora la experiencia y usabilidad de tus apps.", "diseno", "🎨", 84]
];

const LIBROS = [
    ["Artificial Intelligence: A Modern Approach", "Russell & Norvig", "ia", "🤖", "https://aima.cs.berkeley.edu/"],
    ["Python for Data Analysis", "Wes McKinney", "datos", "🐍", "https://wesmckinney.com/book/"],
    ["Clean Code", "Robert C. Martin", "programacion", "💻", "https://www.oreilly.com/library/view/clean-code-a/9780136083238/"],
    ["HTML and CSS: Design and Build Websites", "Jon Duckett", "diseno", "🌐", "https://www.htmlandcssbook.com/"],
    ["Computer Networking: A Top-Down Approach", "Kurose & Ross", "tecnologia", "📡", "https://gaia.cs.umass.edu/kurose_ross/index.php"],
    ["Computer Security: Principles and Practice", "William Stallings", "tecnologia", "🔐", "https://www.pearson.com/en-us/subject-catalog/p/computer-security-principles-and-practice/P200000003271"]
];

const obtenerIntereses = () => [...document.querySelectorAll(".interest-grid input:checked")].map(i => i.value);

function actualizarRecomendaciones() {
    const ints = obtenerIntereses();
    let m = MATERIAS.filter(x => ints.includes(x[2]));
    if (!m.length) m = MATERIAS.slice(0, 4);
    $("subjectRecommendations").innerHTML = m.sort((a, b) => b[4] - a[4]).map(([t, d, , ic, p]) => `
        <div class="recommendation-card">
            <div class="recommendation-icon">${ic}</div>
            <div><h3>${t}</h3><p>${d}</p></div>
            <div class="match">${p}% coincidencia</div>
            <button class="arrow-btn" type="button" onclick="buscarMateria('${t}')" aria-label="Ver ${t}">→</button>
        </div>`).join("");

    let l = LIBROS.filter(x => ints.includes(x[2]));
    if (!l.length) l = LIBROS.slice(0, 3);
    $("bookPreview").innerHTML = l.slice(0, 3).map(([t, a, , ic, url]) => `
        <a class="book-card" href="${url}" target="_blank" rel="noopener noreferrer">
            <div class="book-cover">${ic}</div>
            <strong title="${escaparHTML(t)}">${escaparHTML(t)}</strong>
            <small>${escaparHTML(a)}</small>
        </a>`).join("");
}

function buscarMateria(tema) {
    goToSection("apoyo");
    $("academicSearch").value = tema;
    buscarTemaAcademico();
}

/* ===== LIBROS (Google Books) ===== */

const vacio = (icono, titulo, texto = "") => `<div class="empty-box">${icono}<strong>${titulo}</strong><span>${texto}</span></div>`;

async function buscarLibros() {
    const q = $("bookSearch").value.trim() || "computer science";
    const lang = $("bookLang").value;
    $("bookResults").innerHTML = vacio("🔎", "Buscando libros…");
    try {
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&printType=books${lang ? "&langRestrict=" + lang : ""}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error();
        const items = (await r.json()).items || [];
        if (!items.length) { $("bookResults").innerHTML = vacio("📚", "No encontramos libros", "Prueba con otro término o idioma."); return; }
        $("bookResults").innerHTML = items.map(({ id, volumeInfo: v = {} }) => {
            const img = (v.imageLinks?.thumbnail || "").replace("http://", "https://");
            const desc = (v.description || "Sin descripción disponible.").slice(0, 170);
            return `<div class="resource-card">
                ${img ? `<img src="${escaparHTML(img)}" alt="Portada" loading="lazy">` : ""}
                <h3>${escaparHTML(v.title || "Sin título")}</h3>
                <p><strong>Autor:</strong> ${escaparHTML((v.authors || ["No disponible"]).join(", "))}</p>
                <p>${escaparHTML(desc)}…</p>
                <a href="${escaparHTML(v.previewLink || "https://books.google.com/books?id=" + id)}" target="_blank" rel="noopener noreferrer">Ver en Google Books →</a>
            </div>`;
        }).join("");
    } catch {
        $("bookResults").innerHTML = vacio("⚠️", "No se pudo conectar con Google Books", "Revisa tu conexión e inténtalo de nuevo.");
    }
}

/* ===== ARTÍCULOS (OpenAlex) ===== */

async function buscarArticulos() {
    const q = $("articleSearch").value.trim() || "artificial intelligence";
    $("articleResults").innerHTML = vacio("🔬", "Buscando artículos…");
    try {
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=9&select=id,title,publication_year,doi,primary_location,authorships`;
        const r = await fetch(url);
        if (!r.ok) throw new Error();
        const res = (await r.json()).results || [];
        if (!res.length) { $("articleResults").innerHTML = vacio("📰", "No encontramos resultados", "Prueba con otra búsqueda."); return; }
        $("articleResults").innerHTML = res.map(a => {
            const autores = (a.authorships || []).slice(0, 3).map(x => x.author.display_name).join(", ") || "No disponible";
            const revista = a.primary_location?.source?.display_name || "Revista no indicada";
            return `<div class="resource-card article-card">
                <h3>${escaparHTML(a.title || "Sin título")}</h3>
                <p><strong>Autores:</strong> ${escaparHTML(autores)}</p>
                <p>${escaparHTML(revista)} · ${a.publication_year ?? ""}</p>
                <a href="${escaparHTML(a.doi || a.id)}" target="_blank" rel="noopener noreferrer">Ver artículo →</a>
            </div>`;
        }).join("");
    } catch {
        $("articleResults").innerHTML = vacio("⚠️", "No se pudo conectar con OpenAlex", "Inténtalo de nuevo en unos minutos.");
    }
}

/* ===== NOTAS ===== */

function abrirModalNota() { $("gradeForm").reset(); $("gradeModal").classList.add("show"); }
function cerrarModalNota() { $("gradeModal").classList.remove("show"); }

function mostrarNotas() {
    $("gradesList").innerHTML = notas.length
        ? notas.map(n => `<div><span>${escaparHTML(n.nombre)}</span><b>${n.valor}</b></div>`).join("")
        : "<div><span>Aún no hay notas registradas.</span></div>";
}

function guardarNota(e) {
    e.preventDefault();
    const nombre = $("gradeName").value.trim();
    const valor = Number($("gradeValue").value);
    if (!nombre || Number.isNaN(valor) || valor < 0 || valor > 20) return mostrarToast("Escribe el curso y una nota entre 0 y 20.");
    notas.push({ id: Date.now(), nombre, valor });
    guardar("notas", notas);
    marcar("notas");
    mostrarNotas();
    cerrarModalNota();
    mostrarToast("Nota agregada.");
}

/* ===== CURSOS ===== */

const hh = h => String(h).padStart(2, "0") + ":00";
const convertirHora = t => Number(String(t).split(":")[0]) || 0;
const hayCruce = (a, b) => convertirHora(a.inicio) < convertirHora(b.fin) && convertirHora(b.inicio) < convertirHora(a.fin);

function llenarHoras() {
    $("courseStart").innerHTML = Array.from({ length: 13 }, (_, i) => `<option value="${7 + i}">${hh(7 + i)}</option>`).join("");
    $("courseEnd").innerHTML = Array.from({ length: 13 }, (_, i) => `<option value="${8 + i}">${hh(8 + i)}</option>`).join("");
    $("courseEnd").value = 9;
    $("courseStart").addEventListener("change", () => { $("courseEnd").value = Number($("courseStart").value) + 1; });
}

function abrirModalCurso() { $("courseForm").reset(); $("courseEnd").value = 8; $("courseModal").classList.add("show"); }
function cerrarModalCurso() { $("courseModal").classList.remove("show"); }

function mostrarCursos() {
    $("courseGroup").innerHTML = cursos.length ? cursos.map(c => `
        <div class="course-check">
            <label class="course-label">
                <input type="checkbox" class="schedule-course" value="${c.id}" checked>
                <span><strong>${escaparHTML(c.nombre)}</strong><small>${c.dia} · ${c.inicio} - ${c.fin}</small></span>
            </label>
            <button type="button" class="course-delete" onclick="eliminarCurso(${c.id})" title="Eliminar curso" aria-label="Eliminar ${escaparHTML(c.nombre)}">🗑️</button>
        </div>`).join("")
        : vacio("📚", "Todavía no tienes materias", "Agrega tus materias para crear horarios.");
}

function guardarCurso(e) {
    e.preventDefault();
    const nombre = $("courseName").value.trim();
    const ini = Number($("courseStart").value), fin = Number($("courseEnd").value);
    const dia = $("courseDay").value;
    if (!nombre) return mostrarToast("Escribe el nombre de la materia.");
    if (fin <= ini) return mostrarToast("La hora de fin debe ser mayor que la de inicio.");
    const nuevo = { id: Date.now(), nombre, profesor: $("courseTeacher").value.trim(), dia, inicio: hh(ini), fin: hh(fin) };
    const choque = cursos.find(c => c.dia === dia && hayCruce(c, nuevo));
    if (choque) return mostrarToast(`Se cruza con "${choque.nombre}" el mismo día.`);
    cursos.push(nuevo);
    guardar("cursos", cursos);
    marcar("cursos");
    mostrarCursos();
    cerrarModalCurso();
    mostrarToast(`Materia "${nombre}" agregada.`);
}

function eliminarCurso(id) {
    const c = cursos.find(x => x.id === id);
    if (!c || !confirm(`¿Eliminar "${c.nombre}"?`)) return;
    cursos = cursos.filter(x => x.id !== id);
    guardar("cursos", cursos);
    mostrarCursos();
    estadoHorario("Materia eliminada. Vuelve a generar tu horario.");
}

/* ===== HORARIOS (BACKTRACKING) ===== */

function obtenerRestricciones() {
    const ids = ["noLunes", "noMartes", "noMiercoles", "noJueves", "noViernes"];
    return {
        noTarde: $("noTarde").checked,
        noTemprano: $("noTemprano").checked,
        sinHuecos: $("sinHuecos").checked,
        maxClasesDia: Number($("maxClasesDia").value),
        diasBloqueados: DIAS.filter((_, i) => $(ids[i]).checked)
    };
}

function maximoOk(h, r) {
    const n = {};
    h.forEach(c => n[c.dia] = (n[c.dia] || 0) + 1);
    return Object.values(n).every(t => t <= r.maxClasesDia);
}

function sinHuecosOk(h) {
    const porDia = {};
    h.forEach(c => (porDia[c.dia] ||= []).push(c));
    return Object.values(porDia).every(cl => {
        cl.sort((a, b) => convertirHora(a.inicio) - convertirHora(b.inicio));
        return cl.every((c, i) => i === cl.length - 1 || convertirHora(c.fin) === convertirHora(cl[i + 1].inicio));
    });
}

function generarCombinaciones(lista, r, limite = 20) {
    const res = [], act = [];
    (function bt(i) {
        if (res.length >= limite) return;
        if (i === lista.length) {
            if (!r.sinHuecos || sinHuecosOk(act)) res.push(act.map(c => ({ ...c })));
            return;
        }
        const c = lista[i], h = convertirHora(c.inicio);
        if (r.diasBloqueados.includes(c.dia) || (r.noTarde && h >= 13) || (r.noTemprano && h < 9)) return;
        if (act.some(x => x.dia === c.dia && hayCruce(x, c))) return;
        act.push(c);
        if (maximoOk(act, r)) bt(i + 1);
        act.pop();
    })(0);
    return res;
}

function estadoHorario(texto, icono = "📅") {
    $("scheduleStatus").textContent = texto;
    $("scheduleCounter").textContent = "Sin generar";
    $("scheduleOptions").innerHTML = `<div class="schedule-placeholder">${icono}<strong>${texto}</strong></div>`;
}

function generarHorarios() {
    const ids = [...document.querySelectorAll(".schedule-course:checked")].map(i => Number(i.value));
    const lista = cursos.filter(c => ids.includes(c.id));
    if (!lista.length) return estadoHorario("Agrega y selecciona al menos una materia.");

    const horarios = generarCombinaciones(lista, obtenerRestricciones());
    if (!horarios.length) {
        estadoHorario("No hay horarios compatibles. Prueba quitando alguna restricción.", "⚠️");
        $("scheduleCounter").textContent = "0 opciones";
        return;
    }

    marcar("horario");
    $("scheduleStatus").textContent = "Horario generado sin cruces.";
    $("scheduleCounter").textContent = horarios.length === 1 ? "1 opción" : `${horarios.length} opciones`;
    $("scheduleOptions").innerHTML = horarios.map(crearHorarioHTML).join("");
}

function crearHorarioHTML(horario, n) {
    let html = `<div class="schedule-option">
        <div class="schedule-option-head"><strong>Opción ${n + 1}</strong><span class="valid-badge">SIN CRUCES</span></div>
        <div class="schedule-table"><div class="schedule-header">Hora</div>
        ${DIAS.map(d => `<div class="schedule-header">${d.slice(0, 3)}</div>`).join("")}`;

    for (let h = 7; h <= 20; h++) {
        html += `<div class="time-cell">${hh(h)}</div>`;
        DIAS.forEach(d => {
            const i = horario.findIndex(c => c.dia === d && convertirHora(c.inicio) <= h && convertirHora(c.fin) > h);
            html += i < 0 ? "<div></div>"
                : `<div class="class-cell ${COLORES[i % COLORES.length]}">${escaparHTML(horario[i].nombre)}<small>${horario[i].inicio} - ${horario[i].fin}</small></div>`;
        });
    }
    return html + "</div></div>";
}

/* ===== APOYO ACADÉMICO (Wikipedia) ===== */

async function buscarTemaAcademico() {
    const q = $("academicSearch").value.trim();
    if (!q) return mostrarToast("Escribe un tema académico.");
    $("academicResults").innerHTML = vacio("🔎", "Buscando temas…");
    try {
        const r = await fetch(`https://es.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&format=json&origin=*`);
        const titulos = (await r.json())[1] || [];
        if (!titulos.length) { $("academicResults").innerHTML = vacio("🔎", "Sin resultados", "Prueba con otro término."); return; }
        $("academicResults").innerHTML = titulos.map(t => `
            <button type="button" class="topic-card" data-tema="${escaparHTML(t)}">
                <div class="topic-icon">📘</div>
                <div><strong>${escaparHTML(t)}</strong><small>Wikipedia</small></div><span>→</span>
            </button>`).join("");
        seleccionarTema(titulos[0]);
    } catch {
        $("academicResults").innerHTML = vacio("⚠️", "No se pudo buscar", "Revisa tu conexión.");
    }
}

async function seleccionarTema(tema) {
    $("summaryTitle").textContent = tema;
    $("summaryContent").innerHTML = "<p>Cargando resumen…</p>";
    try {
        const r = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(tema)}`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        $("summaryContent").innerHTML = `<p>${escaparHTML(d.extract)}</p>
            <p><a href="${escaparHTML(d.content_urls.desktop.page)}" target="_blank" rel="noopener noreferrer">Leer más en Wikipedia →</a></p>`;
    } catch {
        $("summaryContent").innerHTML = `<p>No encontramos un resumen para "${escaparHTML(tema)}". Prueba con otro término.</p>`;
    }
}

async function generarResumenCompleto() {
    const t = $("summaryTitle").textContent;
    if (t === "Selecciona un tema") return mostrarToast("Selecciona primero un tema.");
    $("summaryContent").innerHTML = "<p>Generando resumen completo…</p>";
    try {
        const r = await fetch(`https://es.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exchars=2500&redirects=1&titles=${encodeURIComponent(t)}&format=json&origin=*`);
        const p = Object.values((await r.json()).query.pages)[0];
        $("summaryContent").innerHTML = (p.extract || "").split("\n").filter(Boolean).map(x => `<p>${escaparHTML(x)}</p>`).join("")
            + `<p><small>Fuente: Wikipedia (CC BY-SA)</small></p>`;
    } catch {
        mostrarToast("No se pudo cargar el resumen completo.");
        seleccionarTema(t);
    }
}

function buscarVideos() {
    const t = $("summaryTitle").textContent;
    const q = t === "Selecciona un tema" ? $("academicSearch").value.trim() || "estudiar mejor" : t;
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, "_blank", "noopener");
}

/* ===== PERFIL Y FOTO ===== */

function aplicarFoto() {
    const foto = localStorage.getItem(k("foto")) || window.fotoGoogle || "";
    const inicial = ($("profileDisplayName").textContent || "E").charAt(0).toUpperCase();
    document.querySelectorAll("#topAvatar, #largeAvatar").forEach(a => {
        a.style.backgroundImage = foto ? `url("${foto}")` : "";
        a.style.backgroundSize = "cover";
        a.style.backgroundPosition = "center";
        a.textContent = foto ? "" : inicial;
    });
}

function quitarFoto() {
    localStorage.removeItem(k("foto"));
    window.fotoGoogle = "";
    aplicarFoto();
    mostrarToast("Foto eliminada.");
}

function cargarPerfil() {
    const nombre = perfil.nombre || window.nombreGoogle || "Estudiante";
    const carrera = perfil.carrera || "Ingeniería de Sistemas";
    $("profileName").value = perfil.nombre || window.nombreGoogle || "";
    $("profileCareer").value = carrera;
    $("profileUniversity").value = perfil.universidad || "Universidad César Vallejo";
    if (perfil.semestre) $("profileSemester").value = perfil.semestre;
    $("profileDisplayName").textContent = nombre;
    $("userNameTop").textContent = nombre;
    $("profileDisplayCareer").textContent = carrera;
    $("homeCareer").textContent = carrera;
    aplicarFoto();
}

function guardarPerfil() {
    perfil = {
        nombre: $("profileName").value.trim(),
        carrera: $("profileCareer").value.trim() || "Ingeniería de Sistemas",
        universidad: $("profileUniversity").value.trim(),
        semestre: $("profileSemester").value
    };
    guardar("perfil", perfil);
    marcar("perfil");
    cargarPerfil();
    mostrarToast("Perfil actualizado.");
}

function configurarFoto() {
    $("photoInput").addEventListener("change", e => {
        const archivo = e.target.files[0];
        if (!archivo || !archivo.type.startsWith("image/")) return mostrarToast("Elige un archivo de imagen.");
        const img = new Image();
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = c.height = 200;
            const lado = Math.min(img.width, img.height);
            c.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 200, 200);
            guardar("foto", c.toDataURL("image/jpeg", 0.8));
            window.fotoGoogle = "";
            aplicarFoto();
            URL.revokeObjectURL(img.src);
            mostrarToast("Foto actualizada.");
        };
        img.src = URL.createObjectURL(archivo);
        e.target.value = "";
    });
}

/* ===== INICIO ===== */

document.addEventListener("DOMContentLoaded", () => {
    configurarTema();
    configurarNavegacion();
    configurarFoto();
    llenarHoras();
    $("gradeForm").addEventListener("submit", guardarNota);
    document.querySelectorAll(".interest-grid input").forEach(i => i.addEventListener("change", actualizarRecomendaciones));
    crearCarrusel(".login-cover", FOTOS_UCV);
    crearCarrusel(".hero-art", FOTOS_UCV);
    cargarDatosUsuario("invitado");
});