/*
========================================================

PLADECO OLMUÉ 2027–2030

Archivo:
js/map.js

Descripción:
- Inicializa el mapa Leaflet.
- Configura mapas base Esri y OpenStreetMap.
- Muestra el límite comunal de Olmué.
- Carga proyectos municipales desde tres GeoJSON.
- Identifica proyectos mediante etiquetas.
- Genera una tabla vinculada al mapa.
- Permite seleccionar proyectos desde el mapa o la tabla.

========================================================
*/


// ======================================================
// 1. VARIABLES GENERALES
// ======================================================

let mapa = null;

let capaLimiteComunal = null;

let capaProyectosMunicipales = null;

let capaEtiquetasProyectos = null;

let capaCallesEsri = null;

let capaSatelital = null;

let capaCalles = null;

let vistaInicial = null;

let proyectoSeleccionado = null;

let elementosProyectos = [];

// Variables para crear iniciativas vecinales
let capaDibujoTemporal = null;
let herramientaDibujoActiva = null;
let geometriaIniciativaTemporal = null;
// Control del flujo móvil de creación de iniciativas.
let modoCreacionMovil = false;
let tipoGeometriaMovil = "";
// Iniciativas enviadas durante la sesión actual.
let capaIniciativasEnviadas = null;

let iniciativasEnviadasSesion = [];
// ======================================================
// INICIATIVAS VECINALES
// ======================================================

let supabaseCliente = null;

let capaIniciativasVecinales = null;

let elementosIniciativas = [];

let iniciativaSeleccionada = null;

// Conexión pública de Supabase
const SUPABASE_URL =
    "https://rxdyaoouavepzapvgeqw.supabase.co";

const SUPABASE_PUBLIC_KEY =
    "sb_publishable_m7Pxnac5I37LJCjWYavTqQ_9Y9v2pq0";

// ======================================================
// 2. CONFIGURACIÓN
// ======================================================

// Centro inicial de Olmué
const centroInicial = [-33.005, -71.184];

// Zoom inicial
const zoomInicial = 14;

// Colores
const COLOR_MUNICIPAL = "#7B2CBF";
const COLOR_VECINAL = "#2E7D32";
const COLOR_LIMITE = "#2196D2";

// Archivos geográficos
const ARCHIVO_LIMITE =
    "data/Limite_comunal_Olmue.geojson";

const ARCHIVOS_PROYECTOS = [
    "data/Proyectos_SECPLA_pts.geojson",
    "data/Proyectos_SECPLA_ln.geojson",
    "data/Proyectos_SECPLA_poly.geojson"
];


// ======================================================
// 3. INICIAR CUANDO SE CARGUE EL DOCUMENTO
// ======================================================


document.addEventListener("DOMContentLoaded", function () {

    inicializarMapa();

    configurarBuscadorDirecciones();

    inicializarSupabase();

    cargarLimiteComunal();

    cargarProyectosMunicipales();

    cargarIniciativasVecinales();

    configurarBotonVistaInicial();

    configurarFormularioIniciativa();

    // Filtrar la cartera al escribir en el buscador.
    const buscadorProyectos =
        document.getElementById("buscar-proyectos");

    if (buscadorProyectos) {
        buscadorProyectos.addEventListener(
            "input",
            actualizarTablaProyectos
        );
    }

    const buscadorIniciativas =
    document.getElementById("buscar-iniciativas");

if (buscadorIniciativas) {

    buscadorIniciativas.addEventListener(
        "input",
        actualizarTablaIniciativas
    );

}

});

// ======================================================
// CONECTAR CON SUPABASE
// ======================================================

function inicializarSupabase() {

    if (!window.supabase) {
        console.error(
            "No se cargó la biblioteca de Supabase."
        );
        return;
    }

    supabaseCliente = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLIC_KEY
    );

    console.log("Cliente Supabase inicializado.");
}


 // ======================================================
// APOYOS CIUDADANOS
// ======================================================

let visitanteIdApoyos = null;

// Obtener un identificador persistente para este navegador.
function obtenerVisitanteIdApoyos() {

    if (visitanteIdApoyos) {
        return visitanteIdApoyos;
    }

    const clave = "pladeco_visitante_id";

    try {

        let id = localStorage.getItem(clave);

        if (!id) {

            if (
                !window.crypto ||
                typeof window.crypto.randomUUID !== "function"
            ) {
                throw new Error(
                    "El navegador no permite generar un identificador UUID."
                );
            }

            id = window.crypto.randomUUID();

            localStorage.setItem(clave, id);
        }

        visitanteIdApoyos = id;

        return visitanteIdApoyos;

    } catch (error) {

        console.error(
            "No se pudo recuperar el identificador del visitante:",
            error
        );

        throw new Error(
            "No se pudo identificar este navegador. Revisa la configuración de privacidad."
        );

    }
}


// Consultar el total de apoyos de un elemento.
async function obtenerTotalApoyos(tipo, elementoId) {

    if (!supabaseCliente) {
        throw new Error("Supabase no está inicializado.");
    }

    const { data, error } = await supabaseCliente
        .from("v_apoyos_conteo")
        .select("total_apoyos")
        .eq("tipo_elemento", tipo)
        .eq("elemento_id", String(elementoId))
        .maybeSingle();

    if (error) {
        throw error;
    }

    return Number(data?.total_apoyos ?? 0);
}


// Registrar un apoyo en Supabase.
async function registrarApoyo(tipo, elementoId) {

    if (!supabaseCliente) {
        throw new Error("Supabase no está inicializado.");
    }

    const visitanteId = obtenerVisitanteIdApoyos();

    const { error } = await supabaseCliente
        .from("Apoyos")
        .insert({
            tipo_elemento: tipo,
            elemento_id: String(elementoId),
            visitante_id: visitanteId
        });

    if (error) {

        // La restricción única impide repetir un apoyo
        // del mismo visitante para el mismo elemento.
        if (error.code === "23505") {
            return {
                registrado: false,
                duplicado: true
            };
        }

        throw error;
    }

    return {
        registrado: true,
        duplicado: false
    };
}


// Recordar en este navegador qué elementos ya se apoyaron.
function apoyoGuardadoLocalmente(tipo, elementoId) {

    try {

        return localStorage.getItem(
            "pladeco_apoyo_" + tipo + "_" + String(elementoId)
        ) === "si";

    } catch (_) {

        return false;

    }
}


function guardarApoyoLocalmente(tipo, elementoId) {

    try {

        localStorage.setItem(
            "pladeco_apoyo_" + tipo + "_" + String(elementoId),
            "si"
        );

    } catch (error) {

        console.warn(
            "No se pudo guardar el estado local del apoyo:",
            error
        );

    }
}


 // ======================================================
// CONSTRUIR BOTÓN Y CONTADOR DE APOYOS
// ======================================================


async function prepararBotonApoyo(tipo, elementoId, contenedor) {

    const boton = contenedor.querySelector(".btn-apoyo");
    const contador = contenedor.querySelector(".contador-apoyos");
    const mensaje = contenedor.querySelector(".mensaje-apoyo");

    if (!boton || !contador || !mensaje) {
        return;
    }

    // Mostrar el ícono blanco junto al texto del botón.
    function establecerContenidoBoton(texto) {
        const icono = `
            <svg
                class="icono-boton-apoyo"
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                focusable="false"
            >
                <path d="M7 10v12H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3Z"/>
                <path d="M7 10l5-8a3 3 0 0 1 3 3l-1 5h5.5a3 3 0 0 1 2.9 3.8l-2.1 8a3 3 0 0 1-2.9 2.2H7"/>
            </svg>
        `;

        boton.replaceChildren();

        const plantilla = document.createElement("span");
        plantilla.innerHTML = icono;

        boton.appendChild(plantilla.firstElementChild);

        const textoBoton = document.createElement("span");
        textoBoton.textContent = texto;

        boton.appendChild(textoBoton);
    }

    boton.disabled = true;
    establecerContenidoBoton("Cargando...");
    mensaje.textContent = "";

    try {

        const total = await obtenerTotalApoyos(tipo, elementoId);
        const yaApoyo = apoyoGuardadoLocalmente(tipo, elementoId);

        contador.textContent = String(total);

        establecerContenidoBoton(
            yaApoyo ? "Apoyo registrado" : "Apoyar"
        );

        boton.disabled = yaApoyo;

    } catch (error) {

        console.error("Error al cargar apoyos:", error);

        contador.textContent = "—";
        establecerContenidoBoton("No disponible");
        mensaje.textContent = "No se pudo cargar el conteo.";

        return;
    }

    boton.addEventListener("click", async function () {

        if (boton.disabled) {
            return;
        }

        boton.disabled = true;
        establecerContenidoBoton("Registrando...");
        mensaje.textContent = "";

        try {

            const resultado = await registrarApoyo(tipo, elementoId);

            if (resultado.duplicado) {

                guardarApoyoLocalmente(tipo, elementoId);

                establecerContenidoBoton("Apoyo registrado");
                mensaje.textContent =
                    "Este navegador ya había apoyado este elemento.";

            } else {

                guardarApoyoLocalmente(tipo, elementoId);

                const nuevoTotal = await obtenerTotalApoyos(tipo, elementoId);

                contador.textContent = String(nuevoTotal);
                establecerContenidoBoton("Apoyo registrado");
                mensaje.textContent = "¡Gracias por tu apoyo!";

            }

        } catch (error) {

            console.error("Error al registrar el apoyo:", error);

            boton.disabled = false;
            establecerContenidoBoton("Reintentar");

            mensaje.textContent =
                "No se pudo registrar el apoyo. Inténtalo nuevamente.";

        }

    });

}



// ======================================================
// CARGAR INICIATIVAS VECINALES PUBLICADAS
// ======================================================

async function cargarIniciativasVecinales() {

    if (!supabaseCliente) {
        console.error(
            "No se puede cargar iniciativas: Supabase no está inicializado."
        );
        return;
    }

    try {

        const { data, error } = await supabaseCliente
            .from("iniciativas")
            .select(`
                id,
                numero_iniciativa,
                titulo,
                descripcion,
                tipo_geometria,
                geometria,
                direccion,
                fecha_creacion
            `)
            .eq("estado", "publicada")
            .order("numero_iniciativa", { ascending: true });

        if (error) {
            throw error;
        }

        // Limpiar las capas y registros anteriores.
        capaIniciativasVecinales.clearLayers();
        elementosIniciativas = [];

        (data || []).forEach(function (iniciativa) {

            let geometria = iniciativa.geometria;

            // Admitir geometría almacenada como objeto o texto JSON.
            if (typeof geometria === "string") {
                try {
                    geometria = JSON.parse(geometria);
                } catch (errorGeometria) {
                    console.warn(
                        "No se pudo interpretar la geometría:",
                        iniciativa.id,
                        errorGeometria
                    );
                    return;
                }
            }

            if (
                !geometria ||
                !geometria.type ||
                !geometria.coordinates
            ) {
                console.warn(
                    "Iniciativa con geometría inválida:",
                    iniciativa.id
                );
                return;
            }

            // Propiedades asociadas a la entidad GeoJSON.
            const propiedades = {
                id: iniciativa.id,
                numero_iniciativa: iniciativa.numero_iniciativa,
                titulo: iniciativa.titulo,
                descripcion: iniciativa.descripcion,
                tipo_geometria: iniciativa.tipo_geometria,
                direccion: iniciativa.direccion,
                fecha_creacion: iniciativa.fecha_creacion
            };

            const feature = {
                type: "Feature",
                geometry: geometria,
                properties: propiedades
            };

            const registro = {
                id: iniciativa.id,
                numero_iniciativa: iniciativa.numero_iniciativa,
                nombre: iniciativa.titulo,
                propiedades: propiedades,
                feature: feature,
                capa: null
            };

            const capa = L.geoJSON(feature, {

                // Simbología para líneas y polígonos.
                style: function (elemento) {

                    const tipo = elemento.geometry.type;

                    const esLinea =
                        tipo === "LineString" ||
                        tipo === "MultiLineString";

                    return {
                        color: COLOR_VECINAL,
                        weight: esLinea ? 5 : 3,
                        opacity: 0.9,
                        fillColor: COLOR_VECINAL,
                        fillOpacity: esLinea ? 0 : 0.25
                    };

                },

                // Simbología para puntos: círculo verde numerado.
                pointToLayer: function (elemento, latlng) {

                    const numero =
                        elemento.properties.numero_iniciativa;

                    const etiqueta =
                        numero !== null && numero !== undefined
                            ? numero
                            : "?";

                    return L.marker(latlng, {
                        icon: L.divIcon({
                            className: "icono-iniciativa-vecinal",
                            html: `
                                <div class="circulo-iniciativa-vecinal">
                                    ${etiqueta}
                                </div>
                            `,
                            iconSize: [34, 34],
                            iconAnchor: [17, 17]
                        }),
                        keyboard: true,
                        title: iniciativa.titulo
                    });

                }

            });

            registro.capa = capa;

            // Mantener la interacción con la iniciativa.
            capa.on("click", function (evento) {

    L.DomEvent.stopPropagation(evento);

    seleccionarIniciativa(registro);

});

            capa.addTo(capaIniciativasVecinales);

            elementosIniciativas.push(registro);

        });

        // Actualizar el listado asociado al mapa.
        actualizarTablaIniciativas();

        console.log(
            "Iniciativas vecinales publicadas cargadas:",
            elementosIniciativas.length
        );

    } catch (error) {

        console.error(
            "Error cargando iniciativas vecinales:",
            error
        );

    }

}


// ======================================================
// POPUP DE INICIATIVA VECINAL
// ======================================================


function mostrarPopupIniciativa(registro) {

    const propiedades = registro.propiedades;

    const descripcion = propiedades.descripcion
        ? escaparHTML(propiedades.descripcion)
        : "Sin descripción disponible.";

    const direccion = propiedades.direccion
        ? escaparHTML(propiedades.direccion)
        : "Sin referencia de ubicación.";

    const contenido = `
        <div class="popup-proyecto popup-con-apoyo">

            <div class="popup-proyecto-encabezado">

                <div class="popup-proyecto-titulo">
                    Iniciativa vecinal
                </div>

                <div class="popup-proyecto-id">
                    ID ${escaparHTML(
                        registro.numero_iniciativa ?? registro.id
                    )}
                </div>

            </div>

            <div class="popup-proyecto-nombre">
                ${escaparHTML(registro.nombre)}
            </div>

            <p>${descripcion}</p>

            <p>
                <strong>Ubicación:</strong>
                ${direccion}
            </p>

            <div
                class="popup-proyecto-acento"
                style="background-color: ${COLOR_VECINAL};"
            ></div>

            <div class="bloque-apoyo">

                <button
                    type="button"
                    class="btn-apoyo"
                    disabled
                >
                    👍 Cargando...
                </button>

                <span class="texto-conteo-apoyos">
                    Apoyos:
                    <strong class="contador-apoyos">—</strong>
                </span>

                <p class="mensaje-apoyo" aria-live="polite"></p>

            </div>

        </div>
    `;

    const limites = registro.capa.getBounds();

    if (!limites.isValid()) {
        return;
    }

    L.popup({
        maxWidth: 320,
        minWidth: 220,
        autoPan: true,
        closeButton: true
    })
    .setLatLng(limites.getCenter())
    .setContent(contenido)
    .openOn(mapa);

    const popupAbierto = mapa.getPopup();

    if (popupAbierto) {
        prepararBotonApoyo(
            "iniciativa",
            registro.id,
            popupAbierto.getElement()
        );
    }

}



// ======================================================
// SELECCIONAR INICIATIVA VECINAL
// ======================================================

function seleccionarIniciativa(registro) {

    if (!registro || !registro.capa) {
        return;
    }

    // Quitar la selección anterior de ambas categorías.
    if (proyectoSeleccionado) {
        restaurarProyectoSeleccionado();
    }

    if (iniciativaSeleccionada) {
        restaurarIniciativaSeleccionada();
    }

    iniciativaSeleccionada = registro;

    const tipo = registro.feature.geometry.type;

    // ======================================
    // RESALTAR GEOMETRÍA
    // ======================================

    registro.capa.eachLayer(function (capa) {

        // Puntos: destacar el círculo verde numerado.
        if (capa instanceof L.Marker) {

            const elemento = capa.getElement();

            if (elemento) {
                const circulo = elemento.querySelector(
                    ".circulo-iniciativa-vecinal"
                );

                if (circulo) {
                    circulo.classList.add("activa");
                }
            }

            capa.setZIndexOffset(3000);

            return;
        }

        // Líneas y polígonos.
        if (capa.setStyle) {

            const esLinea =
                tipo === "LineString" ||
                tipo === "MultiLineString";

            capa.setStyle({
                color: "#FFD400",
                weight: esLinea ? 8 : 5,
                opacity: 1,
                fillColor: "#FFD400",
                fillOpacity: esLinea ? 0 : 0.4
            });

            if (capa.bringToFront) {
                capa.bringToFront();
            }

        }

    });

    // ======================================
    // CENTRAR Y ACERCAR EL MAPA
    // ======================================

    const limites = registro.capa.getBounds();

    if (tipo === "Point" || tipo === "MultiPoint") {

        if (limites.isValid()) {
            mapa.setView(
                limites.getCenter(),
                17,
                { animate: true }
            );
        }

    } else if (limites.isValid()) {

        mapa.fitBounds(limites, {
            padding: [60, 60],
            maxZoom: 17,
            animate: true
        });

    }

    // ======================================
    // RESALTAR FILA DEL LISTADO VECINAL
    // ======================================

    document.querySelectorAll(
        "#tabla-iniciativas .fila-iniciativa"
    ).forEach(function (fila) {

        fila.classList.toggle(
            "seleccionado",
            fila.dataset.iniciativaId === registro.id
        );

    });

    // ======================================
    // MOSTRAR POPUP
    // ======================================

    mostrarPopupIniciativa(registro);

}


// ======================================================
// RESTAURAR SELECCIÓN VECINAL
// ======================================================

function restaurarIniciativaSeleccionada() {

    if (!iniciativaSeleccionada) {
        return;
    }

    const registro = iniciativaSeleccionada;

    mapa.closePopup();

    const tipo = registro.feature.geometry.type;

    registro.capa.eachLayer(function (capa) {

        // Restaurar puntos.
        if (capa instanceof L.Marker) {

            const elemento = capa.getElement();

            if (elemento) {
                const circulo = elemento.querySelector(
                    ".circulo-iniciativa-vecinal"
                );

                if (circulo) {
                    circulo.classList.remove("activa");
                }
            }

            capa.setZIndexOffset(0);

            return;
        }

        // Restaurar líneas y polígonos.
        if (capa.setStyle) {

            const esLinea =
                tipo === "LineString" ||
                tipo === "MultiLineString";

            capa.setStyle({
                color: COLOR_VECINAL,
                weight: esLinea ? 5 : 3,
                opacity: 0.9,
                fillColor: COLOR_VECINAL,
                fillOpacity: esLinea ? 0 : 0.25
            });

        }

    });

    // Quitar el resaltado del listado vecinal.
    document.querySelectorAll(
        "#tabla-iniciativas .fila-iniciativa"
    ).forEach(function (fila) {
        fila.classList.remove("seleccionado");
    });

    iniciativaSeleccionada = null;

}

// ======================================================
// ACTUALIZAR TABLA DE INICIATIVAS
// ======================================================

function actualizarTablaIniciativas() {

    const cuerpo = document.getElementById(
        "tabla-iniciativas"
    );

    if (!cuerpo) {
        return;
    }

    cuerpo.innerHTML = "";

    const buscador = document.getElementById(
        "buscar-iniciativas"
    );

    const normalizar = function (valor) {
        return String(valor ?? "")
            .trim()
            .toLocaleLowerCase("es-CL")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    };

    const termino = buscador
        ? normalizar(buscador.value)
        : "";

    const limitesVisibles = mapa
        ? mapa.getBounds()
        : null;

    const iniciativasFiltradas =
        elementosIniciativas.filter(function (registro) {

            const texto = normalizar(
                String(registro.numero_iniciativa ?? "") +
                " " +
                registro.nombre
            );

            if (!texto.includes(termino)) {
                return false;
            }

            if (
                limitesVisibles &&
                registro.capa
            ) {

                const limites = registro.capa.getBounds();

                if (
                    limites.isValid() &&
                    !limitesVisibles.intersects(limites)
                ) {
                    return false;
                }

            }

            return true;

        });

    // Ordenar por número correlativo.
    iniciativasFiltradas.sort(function (a, b) {

        return Number(a.numero_iniciativa ?? Infinity) -
            Number(b.numero_iniciativa ?? Infinity);

    });

    if (iniciativasFiltradas.length === 0) {

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 2;
        celda.className = "mensaje-vacio";
        celda.textContent =
            "No hay iniciativas publicadas en esta vista.";

        fila.appendChild(celda);
        cuerpo.appendChild(fila);

        return;

    }

    iniciativasFiltradas.forEach(function (registro) {

        const fila = document.createElement("tr");

        fila.className = "fila-proyecto fila-iniciativa";
        fila.tabIndex = 0;
        fila.dataset.iniciativaId = registro.id;

        if (iniciativaSeleccionada === registro) {
            fila.classList.add("seleccionado");
        }

        const celdaNumero = document.createElement("td");
        const etiquetaNumero = document.createElement("span");

        etiquetaNumero.className = "etiqueta-id";
        etiquetaNumero.textContent =
            registro.numero_iniciativa ?? "—";

        celdaNumero.appendChild(etiquetaNumero);

        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = registro.nombre;

        fila.appendChild(celdaNumero);
        fila.appendChild(celdaNombre);

        fila.addEventListener("click", function () {
            seleccionarIniciativa(registro);
        });

        fila.addEventListener("keydown", function (evento) {

            if (
                evento.key === "Enter" ||
                evento.key === " "
            ) {
                evento.preventDefault();
                seleccionarIniciativa(registro);
            }

        });

        cuerpo.appendChild(fila);

    });

}

// ======================================================
// 4. INICIALIZAR MAPA
// ======================================================

function inicializarMapa() {

    if (mapa !== null) {
        mapa.invalidateSize();
        return;
    }

    // Crear mapa
    mapa = L.map("mapa", {
        zoomControl: false
    });

    mapa.setView(centroInicial, zoomInicial);

// Actualizar la cartera cuando cambie el área visible.
    mapa.on("moveend", actualizarTablaProyectos);

    mapa.on("moveend", actualizarTablaIniciativas);

    // Control de zoom
    L.control.zoom({
        position: "topright"
    }).addTo(mapa);


    // --------------------------------------------------
    // MAPA DE CALLES: OPENSTREETMAP
    // --------------------------------------------------

    capaCalles = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    );


    // --------------------------------------------------
    // MAPA SATELITAL: ESRI
    // --------------------------------------------------

    capaSatelital = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Tiles &copy; Esri",
            maxZoom: 19
        }
    );


    // --------------------------------------------------
    // NOMBRES DE CALLES: ESRI
    // --------------------------------------------------

    capaCallesEsri = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Labels &copy; Esri",
            maxZoom: 19
        }
    );


    // --------------------------------------------------
    // CAPAS DE PROYECTOS
    // --------------------------------------------------

    capaProyectosMunicipales = L.featureGroup().addTo(mapa);

    capaEtiquetasProyectos = L.featureGroup().addTo(mapa);

    // Capa independiente de iniciativas vecinales.
    capaIniciativasVecinales = L.featureGroup().addTo(mapa);


    // Capa temporal para dibujar una nueva iniciativa.
    capaDibujoTemporal = L.featureGroup().addTo(mapa);

    // Capa de iniciativas enviadas por la persona durante su sesión.
capaIniciativasEnviadas = L.featureGroup().addTo(mapa);
    // --------------------------------------------------
    // CAPA DEL LÍMITE COMUNAL
    // --------------------------------------------------

    capaLimiteComunal = L.geoJSON(null, {

    interactive: false,

    style: function () {

        return {
            color: "#2196D2",
            weight: 4,
            opacity: 1,
            fill: false,
            fillOpacity: 0,
            lineCap: "round",
            lineJoin: "round"
        };

    }

});


    // --------------------------------------------------
    // MAPA BASE PREDETERMINADO
    // --------------------------------------------------

    capaSatelital.addTo(mapa);

    capaCallesEsri.addTo(mapa);


    // --------------------------------------------------
    // CONTROL DE CAPAS
    // --------------------------------------------------

    L.control.layers(
        {
            "🛰️ Satélite": capaSatelital,
            "🗺️ Calles": capaCalles
        },
        {
            "📍 Proyectos municipales": capaProyectosMunicipales,
            "🔢 Identificadores": capaEtiquetasProyectos,
            "🟢 Iniciativas vecinales": capaIniciativasVecinales,
            "Límite comunal de Olmué": capaLimiteComunal
        },
        {
            position: "topright",
            collapsed: true
        }
    ).addTo(mapa);


    // --------------------------------------------------
    // CAMBIAR ETIQUETAS SEGÚN MAPA BASE
    // --------------------------------------------------

    mapa.on("baselayerchange", function (evento) {

        if (evento.name === "🛰️ Satélite") {

            if (!mapa.hasLayer(capaCallesEsri)) {
                capaCallesEsri.addTo(mapa);
            }

        }

        if (evento.name === "🗺️ Calles") {

            if (mapa.hasLayer(capaCallesEsri)) {
                mapa.removeLayer(capaCallesEsri);
            }

        }

    });


mapa.on("click", function (evento) {

    if (
        evento.originalEvent &&
        evento.originalEvent.defaultPrevented
    ) {
        return;
    }

    if (proyectoSeleccionado) {
        restaurarProyectoSeleccionado();
    }

    if (iniciativaSeleccionada) {
        restaurarIniciativaSeleccionada();
    }

});

    

mapa.on(L.Draw.Event.CREATED, function (evento) {

    const selectorEscritorio =
        document.getElementById("iniciativa-tipo");

    const selectorMovil =
        document.getElementById("tipo-dibujo-movil");

    const estadoEscritorio =
        document.getElementById("estado-geometria-iniciativa");

    const estadoMovil =
        document.getElementById("estado-dibujo-movil");

    const tipo = modoCreacionMovil
        ? tipoGeometriaMovil
        : selectorEscritorio?.value;

    const estado = modoCreacionMovil
        ? estadoMovil
        : estadoEscritorio;

    // Invalidar cualquier geometría anterior antes de validar.
    geometriaIniciativaTemporal = null;

    if (capaDibujoTemporal) {
        capaDibujoTemporal.clearLayers();
    }

    // Verificar que Turf.js esté disponible.
    if (typeof turf === "undefined") {

        if (estado) {
            estado.textContent =
                "No se pudo cargar la validación geográfica. Recarga la página.";
        }

        console.error("Turf.js no está disponible.");
        return;
    }

    // Verificar que el límite comunal esté cargado.
    if (
        !capaLimiteComunal ||
        capaLimiteComunal.getLayers().length === 0
    ) {

        if (estado) {
            estado.textContent =
                "El límite comunal aún no está disponible. Inténtalo nuevamente.";
        }

        console.error("No está cargado el límite comunal.");
        return;
    }

    if (!["punto", "linea", "poligono"].includes(tipo)) {

        if (estado) {
            estado.textContent =
                "Selecciona un tipo de geometría válido antes de dibujar.";
        }

        return;
    }

    const geometriaDibujada = evento.layer.toGeoJSON();
    const limite = capaLimiteComunal.toGeoJSON();

    try {

        // Extraer los polígonos del límite comunal.
        const poligonos = [];

        function extraerPoligonos(elemento) {

            if (!elemento) return;

            if (elemento.type === "FeatureCollection") {

                elemento.features.forEach(extraerPoligonos);

            } else if (elemento.type === "Feature") {

                extraerPoligonos(elemento.geometry);

            } else if (
                elemento.type === "Polygon" ||
                elemento.type === "MultiPolygon"
            ) {

                poligonos.push(turf.feature(elemento));

            }
        }

        extraerPoligonos(limite);

        if (poligonos.length === 0) {
            throw new Error(
                "El límite comunal no contiene polígonos válidos."
            );
        }

        // Unificar las partes del límite comunal.
        let cobertura = poligonos[0];

        for (let i = 1; i < poligonos.length; i++) {

            cobertura = turf.union(
                turf.featureCollection([
                    cobertura,
                    poligonos[i]
                ])
            );

        }

        if (!cobertura) {
            throw new Error(
                "No fue posible procesar el límite comunal."
            );
        }

        // Comprobar que la geometría esté dentro del límite.
        const dentroDelLimite = turf.booleanWithin(
            geometriaDibujada,
            cobertura
        );

        
if (!dentroDelLimite) {

    if (estado) {
        estado.textContent =
            "La geometría debe quedar completamente dentro del límite comunal de Olmué. Selecciona una opción e inténtalo nuevamente.";
    }

    // Descartar completamente la geometría inválida.
    geometriaIniciativaTemporal = null;

    if (capaDibujoTemporal) {
        capaDibujoTemporal.clearLayers();
    }

    // En móvil, desmarcar los tres botones.
    if (modoCreacionMovil) {

        tipoGeometriaMovil = "";

        document.querySelectorAll(
            ".opcion-geometria-movil"
            
        ).forEach(function (boton) {
            boton.setAttribute("aria-pressed", "false");
        });

        if (estadoMovil) {
            estadoMovil.textContent =
                "La ubicación quedó fuera del límite de Olmué. Elige una geometría para intentarlo nuevamente.";
        }

    } else if (selectorEscritorio) {

        selectorEscritorio.value = "";

    }

    return;
}


        // Aplicar simbología verde a la geometría validada.
        let capaFinal = evento.layer;

        if (tipo === "punto") {

            capaFinal = L.circleMarker(
                evento.layer.getLatLng(),
                {
                    radius: 7,
                    color: "#2E7D32",
                    weight: 2,
                    opacity: 1,
                    fillColor: "#2E7D32",
                    fillOpacity: 0.9
                }
            );

        } else if (tipo === "linea") {

            capaFinal.setStyle({
                color: "#2E7D32",
                weight: 4,
                opacity: 0.9
            });

        } else if (tipo === "poligono") {

            capaFinal.setStyle({
                color: "#2E7D32",
                weight: 3,
                opacity: 0.9,
                fillColor: "#2E7D32",
                fillOpacity: 0.25
            });

        }

        capaDibujoTemporal.clearLayers();
        capaDibujoTemporal.addLayer(capaFinal);

        // Guardar únicamente la geometría validada.
        geometriaIniciativaTemporal =
            capaFinal.toGeoJSON().geometry;

        if (estado) {
            estado.textContent =
                "Ubicación válida: la iniciativa está dentro del límite comunal de Olmué.";
        }

        // En móvil, pasar al formulario después de validar.
        if (modoCreacionMovil) {
            abrirFormularioDesdeDibujoMovil(tipo);
        }

    
} catch (error) {

    console.error("Error validando la geometría:", error);

    geometriaIniciativaTemporal = null;

    if (capaDibujoTemporal) {
        capaDibujoTemporal.clearLayers();
    }

    if (estado) {
        estado.textContent =
            "No se pudo validar la ubicación. Inténtalo nuevamente.";
    }

    if (modoCreacionMovil) {

        tipoGeometriaMovil = "";

        document.querySelectorAll(
            ".opcion-geometria-movil"
        ).forEach(function (boton) {
            boton.setAttribute("aria-pressed", "false");
        });

        if (estadoMovil) {
            estadoMovil.textContent =
                "No se pudo validar el dibujo. Selecciona una geometría para intentarlo nuevamente.";
        }

    } else if (selectorEscritorio) {

        selectorEscritorio.value = "";

    }


    }

});
}

// ======================================================
// 5. CARGAR LÍMITE COMUNAL
// ======================================================


async function cargarLimiteComunal() {

    try {

        const respuesta = await fetch(ARCHIVO_LIMITE);

        if (!respuesta.ok) {
            throw new Error(
                "No fue posible cargar " + ARCHIVO_LIMITE
            );
        }

        const datos = await respuesta.json();

        capaLimiteComunal.addData(datos);
        capaLimiteComunal.addTo(mapa);

        const limites = capaLimiteComunal.getBounds();

        if (limites.isValid()) {

            // Guardar los límites reales como vista inicial
vistaInicial = limites;

// Ajustar la vista inicial al límite comunal
ajustarVistaInicial();

        }

        console.log("Límite comunal cargado correctamente.");

    } catch (error) {

        console.error("Error cargando el límite comunal:", error);

        mostrarEstado(
            "No se pudo cargar el límite comunal. Revisa el archivo y su ruta.",
            true
        );

    }

}

function ajustarVistaInicial() {
    if (!mapa || !capaLimiteComunal) {
        return;
    }

    const limites = capaLimiteComunal.getBounds();

    if (!limites.isValid()) {
        return;
    }

    const centro = limites.getCenter();

    mapa.setView(centro, 12, {
        animate: false
    });
}



// ======================================================
// 6. CARGAR LOS TRES GEOJSON DE PROYECTOS
// ======================================================

async function cargarProyectosMunicipales() {

    mostrarEstado("Cargando proyectos municipales...");

    let archivosCargados = 0;

    let totalProyectos = 0;

    for (const archivo of ARCHIVOS_PROYECTOS) {

        try {

            const respuesta = await fetch(archivo);

            if (!respuesta.ok) {
                throw new Error(
                    "No fue posible cargar " + archivo
                );
            }

            const datos = await respuesta.json();

            if (
                !datos ||
                !Array.isArray(datos.features)
            ) {
                throw new Error(
                    "El archivo no contiene un GeoJSON FeatureCollection válido."
                );
            }

            archivosCargados++;

            datos.features.forEach(function (feature, indice) {

                if (!feature || !feature.geometry) {
                    console.warn(
                        "Proyecto sin geometría:",
                        archivo,
                        indice
                    );
                    return;
                }

                const propiedades = feature.properties || {};

                const id = obtenerIdentificador(
                    propiedades,
                    feature,
                    archivo,
                    indice
                );

                const nombre = obtenerNombreProyecto(propiedades);

                const registro = {
                    id: id,
                    nombre: nombre,
                    propiedades: propiedades,
                    feature: feature,
                    archivo: archivo,
                    capa: null,
                    etiqueta: null
                };

                crearProyectoEnMapa(registro);

                elementosProyectos.push(registro);

                totalProyectos++;

            });

        } catch (error) {

            console.error(
                "Error cargando archivo de proyectos:",
                archivo,
                error
            );

        }

    }

    actualizarTablaProyectos();

    if (archivosCargados === 0) {

        mostrarEstado(
            "No se pudo cargar ningún GeoJSON de proyectos. Revisa los archivos y sus rutas.",
            true
        );

        return;

    }

    // Ocultar el aviso cuando la carga termina correctamente.
const estadoCarga = document.getElementById("estado-carga");

if (estadoCarga) {
    estadoCarga.style.display = "none";
}

    console.log(
        "Carga de proyectos finalizada:",
        totalProyectos,
        "proyectos."
    );

}


// ======================================================
// 7. OBTENER IDENTIFICADOR
// ======================================================

function obtenerIdentificador(propiedades) {

    const valor = propiedades.ID_2;

    if (
        valor === undefined ||
        valor === null ||
        String(valor).trim() === ""
    ) {
        return "Sin ID";
    }

    return String(valor).trim();
}


// ======================================================
// 8. OBTENER NOMBRE DEL PROYECTO
// ======================================================


function obtenerNombreProyecto(propiedades) {

    const valor = propiedades.PROY;

    if (
        valor === undefined ||
        valor === null ||
        String(valor).trim() === ""
    ) {
        return "Proyecto sin nombre registrado";
    }

    const nombre = String(valor)
        .trim()
        .toLocaleLowerCase("es-CL");

    // Convertir la primera letra de cada oración a mayúscula,
    // manteniendo el resto del texto en minúsculas.
    return nombre.charAt(0).toLocaleUpperCase("es-CL") +
        nombre.slice(1);

}


// ======================================================
// 9. CREAR PROYECTO EN EL MAPA
// ======================================================

function crearProyectoEnMapa(registro) {

    const feature = registro.feature;

    const geometria = feature.geometry;

    // Capa individual para cada proyecto

const capa = L.geoJSON(feature, {

    // Estilo de líneas y polígonos
    style: function (feature) {

        const tipo = feature.geometry.type;

        const esLinea =
            tipo === "LineString" ||
            tipo === "MultiLineString";

        return {
            color: COLOR_MUNICIPAL,
            weight: esLinea ? 5 : 3,
            opacity: 0.9,
            fillColor: COLOR_MUNICIPAL,
            fillOpacity: esLinea ? 0 : 0.18,
            lineCap: "round",
            lineJoin: "round"
        };

    },

    // Estilo de puntos
    pointToLayer: function (feature, latlng) {

        return L.circleMarker(latlng, {
            radius: 7,
            color: "#FFFFFF",
            weight: 1.5,
            opacity: 0.9,
            fillColor: COLOR_MUNICIPAL,
            fillOpacity: 0.8
        });

    }

});



    // Registrar vínculo con el proyecto
    registro.capa = capa;

    capa._registroPLADECO = registro;


// Seleccionar al hacer clic en la geometría
capa.on("click", function (evento) {
    L.DomEvent.stopPropagation(evento);
    seleccionarProyecto(registro);
});



    // Agregar geometría
    capa.addTo(capaProyectosMunicipales);


    // Crear etiqueta con el ID
    const puntoEtiqueta = obtenerCentroEtiqueta(capa);

    if (puntoEtiqueta) {

        const etiqueta = L.marker(puntoEtiqueta, {

            icon: L.divIcon({

                className: "etiqueta-municipal",

                html:
                    '<span class="etiqueta-id-mapa">' +
                    escaparHTML(registro.id) +
                    '</span>',

                iconSize: [28, 28],
                iconAnchor: [14, 14]

            }),

            keyboard: true,
            title: registro.id,
            riseOnHover: true

        });

        etiqueta._registroPLADECO = registro;


etiqueta.on("click", function (evento) {

    if (evento.originalEvent) {
        L.DomEvent.stopPropagation(evento.originalEvent);
    }

    seleccionarProyecto(registro);

});


        etiqueta.addTo(capaEtiquetasProyectos);

        registro.etiqueta = etiqueta;

    }

}


// ======================================================
// 10. OBTENER CENTRO DE ETIQUETA
// ======================================================


function obtenerCentroEtiqueta(capa) {

    let centro = null;

    // Buscar el centro de la geometría real
    capa.eachLayer(function (layer) {

        if (centro) return;

        // Para puntos
        if (layer instanceof L.CircleMarker) {
            centro = layer.getLatLng();
            return;
        }

        // Para líneas y polígonos
        if (typeof layer.getCenter === "function") {
            centro = layer.getCenter();
        }

    });

    if (centro) {
        return centro;
    }

    // Alternativa para geometrías que no tengan centro propio
    if (typeof capa.getBounds === "function") {

        const limites = capa.getBounds();

        if (limites.isValid()) {
            return limites.getCenter();
        }

    }

    return null;

}


// ======================================================
// 11. CONSTRUIR TABLA DE PROYECTOS
// ======================================================


function actualizarTablaProyectos() {

    const cuerpo = document.getElementById("tabla-proyectos");

    if (!cuerpo) {
        return;
    }

    cuerpo.innerHTML = "";

    // ======================================
    // 1. OBTENER TEXTO DE BÚSQUEDA
    // ======================================

    const buscador = document.getElementById("buscar-proyectos");

    const termino = buscador
        ? buscador.value
            .trim()
            .toLocaleLowerCase("es-CL")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
        : "";

    // ======================================
    // 2. OBTENER EXTENSIÓN VISIBLE DEL MAPA
    // ======================================

    const limitesVisibles = mapa
        ? mapa.getBounds()
        : null;

    // ======================================
    // 3. APLICAR AMBOS FILTROS
    // ======================================

    const proyectosFiltrados = elementosProyectos.filter(
        function (registro) {

            // Buscar por ID o nombre.
            const textoProyecto = (
                String(registro.id) + " " + registro.nombre
            )
                .toLocaleLowerCase("es-CL")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            const coincideBusqueda =
                textoProyecto.includes(termino);

            if (!coincideBusqueda) {
                return false;
            }

            // Mostrar solo proyectos dentro del área visible.
            if (
                limitesVisibles &&
                registro.capa &&
                typeof registro.capa.getBounds === "function"
            ) {

                const limitesProyecto = registro.capa.getBounds();

                if (
                    limitesProyecto.isValid() &&
                    !limitesVisibles.intersects(limitesProyecto)
                ) {
                    return false;
                }

            }

            return true;

        }
    );

    // ======================================
    // 4. MOSTRAR MENSAJE SI NO HAY RESULTADOS
    // ======================================

    if (proyectosFiltrados.length === 0) {

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 2;
        celda.className = "mensaje-vacio";

        if (elementosProyectos.length === 0) {
            celda.textContent = "No hay proyectos disponibles.";
        } else {
            celda.textContent =
                "No hay proyectos que coincidan con los filtros.";
        }

        fila.appendChild(celda);
        cuerpo.appendChild(fila);

        return;
    }

    // ======================================
    // 5. ORDENAR POR ID
    // ======================================

    proyectosFiltrados.sort(function (a, b) {

        return String(a.id).localeCompare(
            String(b.id),
            "es",
            { numeric: true, sensitivity: "base" }
        );

    });

    // ======================================
    // 6. CONSTRUIR FILAS
    // ======================================

    proyectosFiltrados.forEach(function (registro) {

        const fila = document.createElement("tr");

        fila.className = "fila-proyecto";
        fila.tabIndex = 0;
        fila.dataset.proyectoId = registro.id;

        // Conservar el resaltado del proyecto seleccionado.
        if (proyectoSeleccionado === registro) {
            fila.classList.add("seleccionado");
        }

        const celdaID = document.createElement("td");
        const etiquetaID = document.createElement("span");

        etiquetaID.className = "etiqueta-id";
        etiquetaID.textContent = registro.id;

        celdaID.appendChild(etiquetaID);

        const celdaNombre = document.createElement("td");
        celdaNombre.textContent = registro.nombre;

        fila.appendChild(celdaID);
        fila.appendChild(celdaNombre);

        // Seleccionar desde la tabla.
        fila.addEventListener("click", function () {
            seleccionarProyecto(registro);
        });

        // Permitir selección con teclado.
        fila.addEventListener("keydown", function (evento) {

            if (
                evento.key === "Enter" ||
                evento.key === " "
            ) {
                evento.preventDefault();
                seleccionarProyecto(registro);
            }

        });

        cuerpo.appendChild(fila);

    });

}


// ======================================================
// 12. SELECCIONAR PROYECTO
// ======================================================

function seleccionarProyecto(registro) {

    if (!registro || !registro.capa) {
        return;
    }

    // Restaurar selección anterior
    restaurarProyectoSeleccionado();

    proyectoSeleccionado = registro;

    // ======================================
    // RESALTAR GEOMETRÍA SELECCIONADA
    // ======================================

    registro.capa.eachLayer(function (capa) {

        // Puntos
        if (capa instanceof L.CircleMarker) {

            capa.setRadius(11);

            capa.setStyle({
                color: "#FFFFFF",
                weight: 3,
                opacity: 1,
                fillColor: "#FFD400",
                fillOpacity: 1
            });

            return;
        }

        // Líneas y polígonos
        if (capa.setStyle) {

            const tipo = registro.feature.geometry.type;

            const esLinea =
                tipo === "LineString" ||
                tipo === "MultiLineString";

            capa.setStyle({
                color: "#FFD400",
                weight: esLinea ? 8 : 5,
                opacity: 1,
                fillColor: "#FFD400",
                fillOpacity: esLinea ? 0 : 0.4
            });

        }

    });

    // ======================================
    // DESTACAR ETIQUETA ID
    // ======================================

    document.querySelectorAll(".etiqueta-id-mapa").forEach(function (etiqueta) {
        etiqueta.classList.remove("activa");
    });

    if (registro.etiqueta) {

        registro.etiqueta.setZIndexOffset(3000);

        const elemento = registro.etiqueta.getElement();

        if (elemento) {
            const identificador = elemento.querySelector(".etiqueta-id-mapa");

            if (identificador) {
                identificador.classList.add("activa");
            }
        }

        if (registro.etiqueta.getElement()) {
    registro.etiqueta.getElement().style.zIndex = "3000";
}
    }

    // ======================================
    // LLEVAR GEOMETRÍA AL FRENTE
    // ======================================

    if (registro.capa.bringToFront) {
        registro.capa.bringToFront();
    }

    // ======================================
// ACERCAR Y CENTRAR EL MAPA
// ======================================

const tipo = registro.feature.geometry.type;
const limites = registro.capa.getBounds();

if (
    tipo === "Point" ||
    tipo === "MultiPoint"
) {

    // Acercar a proyectos puntuales
    mapa.setView(
        limites.getCenter(),
        17,
        { animate: true }
    );

} else if (limites.isValid()) {

    // Encuadrar líneas y polígonos
    mapa.fitBounds(limites, {
        padding: [60, 60],
        maxZoom: 17,
        animate: true
    });

}
    // ======================================
    // RESALTAR FILA DE LA TABLA
    // ======================================

    document.querySelectorAll(".fila-proyecto").forEach(function (fila) {

        fila.classList.toggle(
            "seleccionado",
            fila.dataset.proyectoId === registro.id
        );

    });

    // ======================================
// MOSTRAR POPUP DEL PROYECTO
// ======================================



const contenidoPopup = `
    <div class="popup-proyecto popup-con-apoyo">

        <div class="popup-proyecto-encabezado">

            <div class="popup-proyecto-titulo">
                Proyecto municipal
            </div>

            <div class="popup-proyecto-id">
                ID ${escaparHTML(registro.id)}
            </div>

        </div>

        <div class="popup-proyecto-nombre">
            ${escaparHTML(registro.nombre)}
        </div>

        <div class="popup-proyecto-acento"></div>

        <div class="bloque-apoyo">
            <button
                type="button"
                class="btn-apoyo"
                disabled
            >
                👍 Cargando...
            </button>

            <span class="texto-conteo-apoyos">
                Apoyos:
                <strong class="contador-apoyos">—</strong>
            </span>

            <p class="mensaje-apoyo" aria-live="polite"></p>
        </div>

    </div>
`;


const centroPopup = obtenerCentroEtiqueta(registro.capa);

if (centroPopup) {

    L.popup({
        maxWidth: 320,
        minWidth: 220,
        autoPan: true,
        closeButton: true
    })
    .setLatLng(centroPopup)
    .setContent(contenidoPopup)
.openOn(mapa);

const elementoPopup = document.querySelector(".leaflet-popup");

if (elementoPopup) {
    prepararBotonApoyo(
        "proyecto",
        registro.id,
        elementoPopup
    );
}

}
}
// ======================================================
// 13. RESTAURAR SELECCIÓN ANTERIOR
// ======================================================


function restaurarProyectoSeleccionado() {

    if (!proyectoSeleccionado) {
        return;
    }

    const registro = proyectoSeleccionado;

// Cerrar el popup del proyecto anterior.
mapa.closePopup();

    const tipo = registro.feature.geometry.type;

    const esLinea =
        tipo === "LineString" ||
        tipo === "MultiLineString";

    registro.capa.eachLayer(function (capa) {

        // Restaurar puntos
        if (capa instanceof L.CircleMarker) {

            capa.setRadius(7);

            capa.setStyle({
                color: "#FFFFFF",
                weight: 1.5,
                opacity: 0.9,
                fillColor: COLOR_MUNICIPAL,
                fillOpacity: 0.8
            });

            return;
        }

        // Restaurar líneas y polígonos
        if (capa.setStyle) {

            capa.setStyle({
                color: COLOR_MUNICIPAL,
                weight: esLinea ? 5 : 3,
                opacity: 0.9,
                fillColor: COLOR_MUNICIPAL,
                fillOpacity: esLinea ? 0 : 0.18
            });

        }

    });


    if (registro.etiqueta) {

        registro.etiqueta.setZIndexOffset(0);

        const elemento = registro.etiqueta.getElement();

        if (elemento) {
            const identificador = elemento.querySelector(".etiqueta-id-mapa");

            if (identificador) {
                identificador.classList.remove("activa");
            }
        }

    }


    // Quitar selección visual de la tabla
    document.querySelectorAll(".fila-proyecto").forEach(function (fila) {
        fila.classList.remove("seleccionado");
    });

    proyectoSeleccionado = null;

}



// ======================================================
// 14. BOTÓN VISTA INICIAL
// ======================================================



function configurarBotonVistaInicial() {

    const boton = document.getElementById("btn-vista-inicial");

    if (!boton) return;

    boton.addEventListener("click", function () {

        // Quitar la selección actual.
        if (proyectoSeleccionado) {
            restaurarProyectoSeleccionado();
        }

        // Cerrar cualquier popup abierto.
        mapa.closePopup();

        // Volver exactamente a la vista inicial.
        ajustarVistaInicial();

    });

}


// ======================================================
// 15. MOSTRAR ESTADO DE CARGA
// ======================================================

function mostrarEstado(mensaje, esError = false) {

    const elemento = document.getElementById("estado-carga");

    if (!elemento) {
        return;
    }

    elemento.textContent = mensaje;

    if (esError) {

        elemento.style.backgroundColor = "#FCE8E6";
        elemento.style.color = "#A12622";

    } else {

        elemento.style.backgroundColor = "#F5E8DA";
        elemento.style.color = "#94521F";

    }

}


// ======================================================
// 16. ESCAPAR TEXTO PARA HTML
// ======================================================

function escaparHTML(valor) {

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ======================================================
// 17. COLOR DE RESALTADO
// ======================================================

function COLOR_PRINCIPAL_OSCURO() {

    return "#94521F";

}


/**
 * Activa el dibujo de una iniciativa vecinal.
 *
 * tipo puede ser:
 * - "punto"
 * - "linea"
 * - "poligono"
 */

function activarDibujoIniciativa(tipo) {
  cancelarDibujoIniciativa();

  const verde = "#2E7D32";

  if (tipo === "punto") {
    herramientaDibujoActiva = new L.Draw.Marker(mapa, {
      icon: L.divIcon({
        className: "iniciativa-punto-verde",
        html: `
          <div style="
            width: 14px;
            height: 14px;
            background: ${verde};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 1px ${verde};
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    });

  } else if (tipo === "linea") {
    herramientaDibujoActiva = new L.Draw.Polyline(mapa, {
        shapeOptions: {
            color: verde,
            weight: 4,
            opacity: 0.9
        }
    });

    // En móviles, finalizar la línea con doble clic,
    // igual que el mecanismo utilizado por los polígonos.
    if (modoCreacionMovil) {
        herramientaDibujoActiva._updateFinishHandler = function () {
            const cantidad = this._markers.length;

            if (cantidad > 1) {
                this._markers[cantidad - 1].on(
                    "dblclick",
                    this._finishShape,
                    this
                );

                if (cantidad > 2) {
                    this._markers[cantidad - 2].off(
                        "dblclick",
                        this._finishShape,
                        this
                    );
                }
            }
        };
    }
  

  } else if (tipo === "poligono") {
    herramientaDibujoActiva = new L.Draw.Polygon(mapa, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: {
        color: verde,
        weight: 3,
        opacity: 0.9,
        fillColor: verde,
        fillOpacity: 0.25
      }
    });
  }

  if (herramientaDibujoActiva) {
    herramientaDibujoActiva.enable();
  }
}



/**
 * Cancela el dibujo y elimina la geometría temporal.
 */

function cancelarDibujoIniciativa() {

    if (herramientaDibujoActiva) {
        herramientaDibujoActiva.disable();
        herramientaDibujoActiva = null;
    }

    // Limpiar el dibujo anterior sin quitar el grupo del mapa.
    if (capaDibujoTemporal) {
        capaDibujoTemporal.clearLayers();

        if (mapa && !mapa.hasLayer(capaDibujoTemporal)) {
            capaDibujoTemporal.addTo(mapa);
        }
    }

    geometriaIniciativaTemporal = null;

    console.log("Dibujo temporal limpiado.");
}


/**
 * Abre el formulario móvil después de validar la geometría.
 * Conserva la ubicación dibujada y superpone el formulario al mapa.
 */
function abrirFormularioDesdeDibujoMovil(tipo) {

    const modal = document.getElementById("modal-iniciativa");
    const formulario = document.getElementById("formulario-iniciativa");
    const selectorTipo = document.getElementById("iniciativa-tipo");
    const panelDibujo = document.getElementById("panel-dibujo-movil");
    const mensaje = document.getElementById("mensaje-formulario-iniciativa");
    const confirmacion = document.getElementById("confirmacion-iniciativa");
    const panelMapa = document.querySelector(".panel-mapa");

    if (
        !modal ||
        !formulario ||
        !selectorTipo ||
        !panelDibujo ||
        !panelMapa ||
        !geometriaIniciativaTemporal
    ) {
        console.error(
            "No se puede abrir el formulario: faltan elementos o una geometría válida."
        );
        return;
    }

    // Preparar los campos sin borrar la geometría validada.
    formulario.reset();
    selectorTipo.value = tipo;

    formulario.hidden = false;

    if (confirmacion) {
        confirmacion.hidden = true;
    }

    if (mensaje) {
        mensaje.textContent = "";
    }

    const estadoGeometria = document.getElementById(
        "estado-geometria-iniciativa"
    );

    if (estadoGeometria) {
        estadoGeometria.textContent =
            "Ubicación validada dentro de Olmué. Puedes completar los datos de tu iniciativa.";
    }

    // Ocultar el selector y mostrar el formulario.
    panelDibujo.hidden = true;

    // Mover el modal dentro del área del mapa para poder superponerlo.
    panelMapa.appendChild(modal);

    modal.classList.add("modal-iniciativa-movil-mapa");
    modal.hidden = false;

    const panelProyectos = document.querySelector(".panel-proyectos");

    if (panelProyectos) {
        panelProyectos.classList.add("creando-iniciativa");
    }

    if (mapa) {
        setTimeout(function () {
            mapa.invalidateSize();
        }, 100);
    }
}

function abrirFormularioDesdeDibujoMovil(tipo) {

    const modal = document.getElementById("modal-iniciativa");
    const formulario = document.getElementById("formulario-iniciativa");
    const selectorTipo = document.getElementById("iniciativa-tipo");
    const panelDibujo = document.getElementById("panel-dibujo-movil");
    const panelMapa = document.querySelector(".panel-mapa");
    const mensaje = document.getElementById("mensaje-formulario-iniciativa");
    const estado = document.getElementById("estado-geometria-iniciativa");
    const confirmacion = document.getElementById("confirmacion-iniciativa");
    const panelProyectos = document.querySelector(".panel-proyectos");

    if (
        !modal ||
        !formulario ||
        !selectorTipo ||
        !panelDibujo ||
        !panelMapa ||
        !geometriaIniciativaTemporal
    ) {
        console.error("No se puede abrir el formulario móvil: falta la geometría o un elemento.");
        return;
    }

    // Conservar la geometría validada.
    formulario.reset();
    selectorTipo.value = tipo;
    formulario.hidden = false;

    if (confirmacion) confirmacion.hidden = true;
    if (mensaje) mensaje.textContent = "";

    if (estado) {
        estado.textContent =
            "Ubicación validada dentro de Olmué.";
    }

    panelDibujo.hidden = true;

    // Superponer el formulario al área del mapa.
    panelMapa.appendChild(modal);
    modal.classList.add("modal-iniciativa-movil-mapa");
    modal.hidden = false;

    if (panelProyectos) {
        panelProyectos.classList.add("creando-iniciativa");
    }

    // El dibujo ya terminó; los cambios posteriores del formulario
    // deben seguir el comportamiento habitual de escritorio.
    modoCreacionMovil = false;
    tipoGeometriaMovil = "";
    herramientaDibujoActiva = null;

    if (mapa) {
        setTimeout(function () {
            mapa.invalidateSize();
        }, 100);
    }
}


function configurarFormularioIniciativa() {

    const modal = document.getElementById("modal-iniciativa");
    const formulario = document.getElementById("formulario-iniciativa");
    const botonAbrir = document.getElementById("btn-crear-iniciativa");
    const botonCerrar = document.getElementById("btn-cerrar-iniciativa");
    const botonCancelar = document.getElementById("btn-cancelar-iniciativa");
    const selectorTipo = document.getElementById("iniciativa-tipo");
    const estadoGeometria = document.getElementById("estado-geometria-iniciativa");
    const mensaje = document.getElementById("mensaje-formulario-iniciativa");

    const confirmacion = document.getElementById("confirmacion-iniciativa");
    const botonVolverListado = document.getElementById("btn-volver-listado");
    const botonOtraIniciativa = document.getElementById("btn-otra-iniciativa");

    const panelProyectos = document.querySelector(".panel-proyectos");

    if (
        !modal ||
        !formulario ||
        !botonAbrir ||
        !botonCerrar ||
        !botonCancelar ||
        !selectorTipo ||
        !estadoGeometria ||
        !mensaje ||
        !confirmacion ||
        !botonVolverListado ||
        !botonOtraIniciativa ||
        !panelProyectos
    ) {
        console.error(
            "No se encontraron todos los elementos del formulario y la confirmación."
        );
        return;
    }

const botonAbrirMovil = document.getElementById(
    "btn-crear-iniciativa-movil"
);

const panelDibujoMovil = document.getElementById(
    "panel-dibujo-movil"
);


const opcionesGeometriaMovil = document.querySelectorAll(
    ".opcion-geometria-movil"
);

const estadoDibujoMovil = document.getElementById(
    "estado-dibujo-movil"
);

const botonCancelarDibujoMovil = document.getElementById(
    "btn-cancelar-dibujo-movil"
);

const botonTerminarDibujoMovil = document.getElementById(
    "btn-terminar-dibujo-movil"
);

// Terminar manualmente una línea dibujada desde el celular.
if (botonTerminarDibujoMovil) {
    botonTerminarDibujoMovil.addEventListener("click", function () {
        if (
            !modoCreacionMovil ||
            tipoGeometriaMovil !== "linea" ||
            !herramientaDibujoActiva
        ) {
            return;
        }

        const marcadores = herramientaDibujoActiva._markers;

        if (!marcadores || marcadores.length < 2) {
            if (estadoDibujoMovil) {
                estadoDibujoMovil.textContent =
                    "Marca al menos dos puntos para terminar la línea.";
            }
            return;
        }

        herramientaDibujoActiva.completeShape();
    });
}

    // Restablecer el formulario y limpiar solamente el dibujo temporal.
    function prepararFormularioNuevo() {

        cancelarDibujoIniciativa();

        formulario.reset();

        geometriaIniciativaTemporal = null;

        mensaje.textContent = "";

        estadoGeometria.textContent =
            "La ubicación se selecciona dibujando directamente en el mapa.";

        formulario.hidden = false;
        confirmacion.hidden = true;

        const botonEnviar = document.getElementById(
            "btn-enviar-iniciativa"
        );

        if (botonEnviar) {
            botonEnviar.disabled = false;
        }
    }


 
    // ==========================================
    // FLUJO EXCLUSIVO PARA MÓVILES
    // ==========================================

    function actualizarSeleccionGeometriaMovil(tipoSeleccionado) {
        opcionesGeometriaMovil.forEach(function (opcion) {
            opcion.setAttribute(
                "aria-pressed",
                opcion.dataset.geometria === tipoSeleccionado
                    ? "true"
                    : "false"
            );
        });
    }

    function cancelarFlujoMovil() {
        modoCreacionMovil = false;
        tipoGeometriaMovil = "";

        cancelarDibujoIniciativa();

        if (panelDibujoMovil) {
            panelDibujoMovil.hidden = true;
        }
        if (botonTerminarDibujoMovil) {
    botonTerminarDibujoMovil.hidden = true;
}

        actualizarSeleccionGeometriaMovil("");

        modal.hidden = true;
        modal.classList.remove("modal-iniciativa-movil-mapa");

        if (modal.parentElement !== panelProyectos) {
            panelProyectos.appendChild(modal);
        }

        panelProyectos.classList.remove("creando-iniciativa");

        if (mapa) {
            setTimeout(function () {
                mapa.invalidateSize();
            }, 100);
        }
    }

    // Abrir la barra inferior.
    if (botonAbrirMovil && panelDibujoMovil) {
        botonAbrirMovil.addEventListener("click", function () {
            prepararFormularioNuevo();

            modoCreacionMovil = true;
            tipoGeometriaMovil = "";

            modal.hidden = true;
            modal.classList.remove("modal-iniciativa-movil-mapa");

            if (modal.parentElement !== panelProyectos) {
                panelProyectos.appendChild(modal);
            }

            actualizarSeleccionGeometriaMovil("");

            panelDibujoMovil.hidden = false;

            if (estadoDibujoMovil) {
                estadoDibujoMovil.textContent =
                    "Elige una geometría para dibujar en el mapa.";
            }

            if (mapa) {
                setTimeout(function () {
                    mapa.invalidateSize();
                }, 100);
            }
        });
    }

    // Seleccionar punto, línea o polígono.
    opcionesGeometriaMovil.forEach(function (boton) {
        boton.addEventListener("click", function () {
            const tipo = boton.dataset.geometria;

            if (!["punto", "linea", "poligono"].includes(tipo)) {
                return;
            }

            cancelarDibujoIniciativa();

            modoCreacionMovil = true;
            tipoGeometriaMovil = tipo;

            actualizarSeleccionGeometriaMovil(tipo);

if (botonTerminarDibujoMovil) {
    botonTerminarDibujoMovil.hidden = tipo !== "linea";
}

activarDibujoIniciativa(tipo);
            activarDibujoIniciativa(tipo);

            if (estadoDibujoMovil) {
                const instrucciones = {
                    punto: "Toca el lugar del mapa donde irá la iniciativa.",
                    linea: "Marca los puntos del recorrido y termina el dibujo.",
                    poligono: "Marca los vértices del área y termina el dibujo."
                };

                estadoDibujoMovil.textContent = instrucciones[tipo];
            }
        });
    });

    if (botonCancelarDibujoMovil) {
        botonCancelarDibujoMovil.addEventListener(
            "click",
            cancelarFlujoMovil
        );
    }

    // Asegurar que el botón de escritorio use el modal en su panel original.
    modoCreacionMovil = false;
    tipoGeometriaMovil = "";

    modal.classList.remove("modal-iniciativa-movil-mapa");

    if (modal.parentElement !== panelProyectos) {
        panelProyectos.appendChild(modal);
    }

    // Abrir el formulario desde el listado.
    botonAbrir.addEventListener("click", function () {

        prepararFormularioNuevo();

        panelProyectos.classList.add("creando-iniciativa");

        modal.hidden = false;

        if (mapa) {
            setTimeout(function () {
                mapa.invalidateSize();
            }, 100);
        }
    });

    // Cerrar el modal y regresar al panel del listado.
    function cerrarFormulario() {
modoCreacionMovil = false;
tipoGeometriaMovil = "";

if (panelDibujoMovil) {
    panelDibujoMovil.hidden = true;
}
actualizarSeleccionGeometriaMovil("");
modal.classList.remove("modal-iniciativa-movil-mapa");

if (modal.parentElement !== panelProyectos) {
    panelProyectos.appendChild(modal);
}
        prepararFormularioNuevo();

        modal.hidden = true;

        panelProyectos.classList.remove("creando-iniciativa");

        if (mapa) {
            setTimeout(function () {
                mapa.invalidateSize();
            }, 100);
        }
    }

    botonCerrar.addEventListener("click", cerrarFormulario);
    botonCancelar.addEventListener("click", cerrarFormulario);

    // BOTÓN 1: volver al listado de proyectos.
    botonVolverListado.addEventListener("click", function () {

        cerrarFormulario();

    });

    // BOTÓN 2: ingresar otra iniciativa.
    botonOtraIniciativa.addEventListener("click", function () {

        prepararFormularioNuevo();

        // El modal permanece abierto, pero vuelve a mostrar el formulario.
        modal.hidden = false;

        panelProyectos.classList.add("creando-iniciativa");

        if (mapa) {
            setTimeout(function () {
                mapa.invalidateSize();
            }, 100);
        }
    });

    // Activar herramienta de dibujo según el tipo seleccionado.
    selectorTipo.addEventListener("change", function () {

        const tipo = selectorTipo.value;

        cancelarDibujoIniciativa();

        if (!tipo) {
            estadoGeometria.textContent =
                "Selecciona un tipo de geometría para comenzar.";
            return;
        }

        activarDibujoIniciativa(tipo);

        estadoGeometria.textContent =
            "Dibuja la geometría en el mapa. " +
            "Cuando termines, la ubicación quedará asociada al formulario.";
    });


    // Enviar iniciativa a Supabase.
    formulario.addEventListener("submit", async function (evento) {

        evento.preventDefault();

        const nombre = document
            .getElementById("iniciativa-nombre")
            .value.trim();

        const rut = document
            .getElementById("iniciativa-rut")
            .value.trim();

        const titulo = document
            .getElementById("iniciativa-titulo")
            .value.trim();

        const descripcion = document
            .getElementById("iniciativa-descripcion")
            .value.trim();

        const tipoSeleccionado = selectorTipo.value;

        const direccion = document
            .getElementById("iniciativa-direccion")
            .value.trim();

        if (!nombre || !rut || !titulo || !descripcion) {
            mensaje.textContent =
                "Completa todos los campos obligatorios.";
            return;
        }

        if (!tipoSeleccionado) {
            mensaje.textContent =
                "Selecciona el tipo de geometría.";
            return;
        }

        if (!geometriaIniciativaTemporal) {
            mensaje.textContent =
                "Primero debes dibujar la ubicación en el mapa.";
            return;
        }

        if (!supabaseCliente) {
            mensaje.textContent =
                "No hay conexión con Supabase. Recarga la página e inténtalo nuevamente.";
            return;
        }

        const botonEnviar = document.getElementById(
            "btn-enviar-iniciativa"
        );

        botonEnviar.disabled = true;
        mensaje.textContent = "Enviando iniciativa...";

        const equivalenciaTipos = {
            punto: "punto",
            linea: "linea",
            poligono: "area"
        };

        const datosIniciativa = {
            nombre: nombre,
            rut: rut,
            titulo: titulo,
            descripcion: descripcion,
            tipo_geometria: equivalenciaTipos[tipoSeleccionado],
            geometria: geometriaIniciativaTemporal,
            direccion: direccion || null
        };

        try {

            const { data, error } =
                await supabaseCliente.functions.invoke(
                    "crear-iniciativa",
                    {
                        body: datosIniciativa
                    }
                );

            if (error) {

                let detalle = error.message;

                if (error.context) {
                    try {
                        const respuestaError =
                            await error.context.json();

                        detalle =
                            respuestaError.error ||
                            respuestaError.mensaje ||
                            detalle;

                    } catch (_) {
                        // Conserva el mensaje original.
                    }
                }

                throw new Error(detalle);
            }

            if (!data || !data.id) {
                throw new Error(
                    data?.error ||
                    "La función no confirmó el registro de la iniciativa."
                );
            }

            console.log(
                "Iniciativa enviada a Supabase:",
                data
            );

            // Guardar una copia de la geometría en la capa de la sesión.
            // Esta capa no se elimina al limpiar el formulario.
            const featureEnviada = {
                type: "Feature",
                geometry: geometriaIniciativaTemporal,
                properties: {
                    titulo: titulo,
                    descripcion: descripcion,
                    direccion: direccion || null,
                    estado: "pendiente"
                }
            };

            const capaEnviada = L.geoJSON(featureEnviada, {

                style: {
                    color: COLOR_VECINAL,
                    weight: 4,
                    opacity: 0.9,
                    fillColor: COLOR_VECINAL,
                    fillOpacity: 0.25,
                    dashArray: "6 5"
                },

                pointToLayer: function (feature, latlng) {

                    return L.circleMarker(latlng, {
                        radius: 8,
                        color: COLOR_VECINAL,
                        weight: 2,
                        fillColor: COLOR_VECINAL,
                        fillOpacity: 0.9
                    });

                }

            });

            capaEnviada.addTo(capaIniciativasEnviadas);

            iniciativasEnviadasSesion.push({
                id: data.id,
                titulo: titulo,
                capa: capaEnviada
            });

            // Limpiar el formulario sin eliminar la iniciativa enviada.
            formulario.reset();

            cancelarDibujoIniciativa();

            estadoGeometria.textContent =
                "La ubicación se selecciona dibujando directamente en el mapa.";

            mensaje.textContent = "";

            // Mostrar la pantalla de confirmación.
            formulario.hidden = true;
            confirmacion.hidden = false;

        } catch (error) {

            console.error(
                "Error al guardar la iniciativa:",
                error
            );

            // Si hay un error, el formulario permanece visible.
            formulario.hidden = false;
            confirmacion.hidden = true;

            mensaje.textContent =
                "No se pudo enviar la iniciativa: " +
                error.message;

        } finally {

            botonEnviar.disabled = false;

        }

    });
}

/**
 * BUSCADOR DE CALLES Y SECTORES CON PHOTON
 * Busca lugares cercanos a Olmué usando OpenStreetMap.
 */


function configurarBuscadorDirecciones() {
    if (!mapa) {
        console.warn("El mapa aún no está inicializado.");
        return;
    }

    const controlBusqueda = L.control({ position: "topright" });

    controlBusqueda.onAdd = function () {
        const contenedor = L.DomUtil.create(
            "div",
            "control-busqueda-photon"
        );

        contenedor.innerHTML = `
            <button
                type="button"
                class="boton-lupa-photon"
                aria-label="Buscar calles y sectores"
                title="Buscar calles y sectores"
                aria-expanded="false"
            >⌕</button>

            <div class="panel-busqueda-photon" hidden>
                <input
                    type="search"
                    class="input-busqueda-photon"
                    placeholder="Buscar calle o sector..."
                    autocomplete="off"
                    aria-label="Buscar calle o sector"
                >
                <div class="resultados-busqueda-photon" hidden></div>
                <p class="estado-busqueda-photon" role="status"></p>
            </div>
        `;

        L.DomEvent.disableClickPropagation(contenedor);
        L.DomEvent.disableScrollPropagation(contenedor);

        const boton = contenedor.querySelector(".boton-lupa-photon");
        const panel = contenedor.querySelector(".panel-busqueda-photon");
        const input = contenedor.querySelector(".input-busqueda-photon");
        const resultados = contenedor.querySelector(
            ".resultados-busqueda-photon"
        );
        const estado = contenedor.querySelector(".estado-busqueda-photon");

        let temporizador = null;
        let controlador = null;
        let marcador = null;

        
boton.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    boton.setAttribute("aria-expanded", String(!panel.hidden));

    if (!panel.hidden) {
        input.focus();
    } else {
        resultados.hidden = true;

        if (marcador) {
            mapa.removeLayer(marcador);
            marcador = null;
        }

        input.value = "";
        mostrarEstado("");
    }
});


        function mostrarEstado(mensaje) {
            estado.textContent = mensaje;
        }

        function limpiarResultados() {
            resultados.replaceChildren();
            resultados.hidden = true;
        }

        function etiquetaLugar(p) {
            const partes = [
                p.name,
                p.street,
                p.housenumber,
                p.district,
                p.city,
                p.state
            ].filter(Boolean);

            return [...new Set(partes)].join(", ") || "Lugar sin nombre";
        }

        input.addEventListener("input", function () {
            clearTimeout(temporizador);

            if (controlador) {
                controlador.abort();
            }

            limpiarResultados();

            const consulta = input.value.trim();

            if (consulta.length < 3) {
                mostrarEstado("Escribe al menos 3 caracteres.");
                return;
            }

            mostrarEstado("Buscando…");

            temporizador = setTimeout(async function () {
                controlador = new AbortController();

                const parametros = new URLSearchParams({
                    q: consulta,
                    lat: "-33.005",
                    lon: "-71.184",
                    limit: "6"
                });

                try {
                    const respuesta = await fetch(
                        `https://photon.komoot.io/api/?${parametros}`,
                        { signal: controlador.signal }
                    );

                    if (!respuesta.ok) {
                        throw new Error(`HTTP ${respuesta.status}`);
                    }

                    const datos = await respuesta.json();

                    if (input.value.trim() !== consulta) return;

                    const lugares = datos.features || [];

                    if (!lugares.length) {
                        mostrarEstado("No se encontraron resultados.");
                        return;
                    }

                    lugares.forEach(function (lugar) {
                        const coordenadas = lugar.geometry?.coordinates;
                        if (!coordenadas || coordenadas.length < 2) return;

                        const lng = Number(coordenadas[0]);
                        const lat = Number(coordenadas[1]);

                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                            return;
                        }

                        const etiqueta = etiquetaLugar(lugar.properties || {});
                        const opcion = document.createElement("button");

                        opcion.type = "button";
                        opcion.className = "opcion-busqueda-photon";
                        opcion.textContent = etiqueta;

                        opcion.addEventListener("click", function () {
                            mapa.setView([lat, lng], 17, { animate: true });

                            if (marcador) {
                                mapa.removeLayer(marcador);
                            }

                            marcador = L.marker([lat, lng])
                                .addTo(mapa)
                                .bindPopup(etiqueta)
                                .openPopup();

                            input.value = etiqueta;
                            limpiarResultados();
                            mostrarEstado("Ubicación seleccionada.");
                        });

                        resultados.appendChild(opcion);
                    });

                    resultados.hidden = resultados.children.length === 0;
                    mostrarEstado(
                        resultados.hidden
                            ? "No se encontraron ubicaciones válidas."
                            : "Selecciona una ubicación."
                    );
                } catch (error) {
                    if (error.name === "AbortError") return;

                    console.error("Error en búsqueda Photon:", error);
                    mostrarEstado("Error al buscar. Inténtalo nuevamente.");
                }
            }, 350);
        });

        input.addEventListener("keydown", function (evento) {
            if (evento.key === "Escape") {
                limpiarResultados();
                panel.hidden = true;
                boton.setAttribute("aria-expanded", "false");
                boton.focus();
            }

            if (evento.key === "Enter") {
                const primeraOpcion = resultados.querySelector(
                    ".opcion-busqueda-photon"
                );

                if (primeraOpcion) {
                    evento.preventDefault();
                    primeraOpcion.click();
                }
            }
        });

        
mapa.on("click", function () {
    if (marcador) {
        mapa.removeLayer(marcador);
        marcador = null;
    }
});


        return contenedor;
    };

    controlBusqueda.addTo(mapa);
}
