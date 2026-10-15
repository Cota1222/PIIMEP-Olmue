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

    const numero = registro.numero_iniciativa;

    const contenido = `
        <div class="popup-proyecto">

            <div class="popup-proyecto-encabezado">

                <div class="popup-proyecto-titulo">
                    Iniciativa vecinal
                </div>

                <div class="popup-proyecto-id">
    ID ${registro.numero_iniciativa ?? registro.id}
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

            <div class="popup-proyecto-acento"
                 style="background-color: ${COLOR_VECINAL};">
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

    // Capturar la geometría creada con Leaflet.draw.

mapa.on(L.Draw.Event.CREATED, function (evento) {
  const tipo = document.getElementById("iniciativa-tipo")?.value;
  const verde = "#2E7D32";

  let capaFinal = evento.layer;

  if (tipo === "punto") {
    // Convertir el marcador en un círculo verde.
    capaFinal = L.circleMarker(evento.layer.getLatLng(), {
      radius: 7,
      color: verde,
      weight: 2,
      opacity: 1,
      fillColor: verde,
      fillOpacity: 0.9
    });

  } else if (tipo === "linea") {
    capaFinal.setStyle({
      color: verde,
      weight: 4,
      opacity: 0.9
    });

  } else if (tipo === "poligono") {
    capaFinal.setStyle({
      color: verde,
      weight: 3,
      opacity: 0.9,
      fillColor: verde,
      fillOpacity: 0.25
    });
  }

  capaDibujoTemporal.clearLayers();
  capaDibujoTemporal.addLayer(capaFinal);

  geometriaIniciativaTemporal = capaFinal.toGeoJSON().geometry;
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
    <div class="popup-proyecto">

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

    // Actualizar mensaje al terminar el dibujo.
    if (mapa) {

        mapa.on(L.Draw.Event.CREATED, function () {

            if (!geometriaIniciativaTemporal) {
                return;
            }

            const nombres = {
                punto: "Punto",
                linea: "Línea",
                poligono: "Polígono"
            };

            estadoGeometria.textContent =
                nombres[selectorTipo.value] +
                " dibujado correctamente. Puedes cambiar el tipo para volver a dibujar.";
        });
    }

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
