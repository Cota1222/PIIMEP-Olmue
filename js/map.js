/*
========================================================

PIIMEP Participa

Archivo:
map.js

Descripción:
Controla la creación del mapa Leaflet,
capas base y visualización de proyectos.

========================================================
*/


// ======================================
// VARIABLES
// ======================================

let mapa = null;

let marcadores = [];

let capasProyectos = [];

let vistaInicial = null;


// ======================================
// PROYECTO SELECCIONADO
// ======================================

let proyectoSeleccionado = null;

let capaProyectoSeleccionado = null;

let capaBordeSeleccionado = null;


// ======================================
// CAPAS DE INFORMACIÓN
// ======================================

let capaParaderos = null;

let capaLimiteUrbano = null;

let nombresCallesEsri = null;


// ======================================
// CONFIGURACIÓN
// ======================================

// Los paraderos aparecen desde este nivel de zoom
const zoomMinimoParaderos = 16;


// Vista inicial del mapa
const centroInicial = [

    -33.005,

    -71.184

];

const zoomInicial = 14;


// ======================================
// COLORES POR CATEGORÍA
// ======================================

// ======================================
// COLORES POR CATEGORÍA
// ======================================

function obtenerColorCategoria(categoria){

    if(categoria === "Movilidad"){

        return "#E88700";

    }

    if(categoria === "Espacio Público"){

        return "#2E7D32";

    }

    return "#666666";

}


// ======================================
// INICIALIZAR MAPA
// ======================================

function inicializarMapa(){


    // ======================================
    // EVITAR CREAR EL MAPA DOS VECES
    // ======================================

    if(mapa !== null){

        mapa.invalidateSize();

        return;

    }


    // ======================================
    // CREAR MAPA
    // ======================================

    mapa = L.map(

        "mapa",

        {

            zoomControl:false

        }

    );


    // ======================================
    // VISTA INICIAL
    // ======================================

    mapa.setView(

        centroInicial,

        zoomInicial

    );


    // ======================================
    // CONTROL ZOOM
    // ======================================

    L.control.zoom({

        position:"topright"

    }).addTo(

        mapa

    );

        // ======================================
    // DESELECCIONAR PROYECTO AL HACER
    // CLICK EN EL MAPA
    // ======================================

    mapa.on(

        "click",

        function(){

            // Si no hay proyecto seleccionado,
            // no hacemos nada
            if(!proyectoSeleccionado){

                return;

            }


            // Restaurar línea y borde
            restaurarProyectoAnterior();


            // Cerrar el detalle del proyecto
            cerrarDetalleProyecto();

        }

    );

    // ======================================
    // CAPAS BASE
    // ======================================

    const mapaCalles = L.tileLayer(

        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            attribution:
                "&copy; OpenStreetMap contributors"

        }

    );


    // ======================================
    // MAPA SATELITAL ESRI
    // ======================================

    const mapaSatelite = L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

        {

            attribution:
                "Tiles &copy; Esri"

        }

    );


    // ======================================
    // NOMBRES DE CALLES ESRI
    // ======================================

    nombresCallesEsri = L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",

        {

            attribution:
                "Labels &copy; Esri",

            pane:
                "overlayPane"

        }

    );


    // ======================================
    // PARADEROS
    // ======================================

    capaParaderos = L.geoJSON(

        null,

        {

            pointToLayer:function(

                feature,

                latlng

            ){

                const nombre =

                    feature.properties?.Paraderos;


                // ======================================
                // BUSCAR NÚMERO DEL PARADERO
                // ======================================

                if(!nombre){

                    return null;

                }


                const coincidencia =

                    String(nombre).match(/\d+/);


                // ======================================
                // SI NO TIENE NÚMERO
                // NO MOSTRAR
                // ======================================

                if(!coincidencia){

                    return null;

                }


                const numero =

                    coincidencia[0];


                // ======================================
                // ICONO PARADERO
                // ======================================

                const iconoParadero =

                    L.divIcon({

                        className:
                            "icono-paradero",

                        html:`

                            <div class="paradero-cuadro">

                                P${numero}

                            </div>

                        `,

                        iconSize:[

                            22,

                            18

                        ],

                        iconAnchor:[

                            11,

                            9

                        ]

                    });


                // ======================================
                // CREAR MARCADOR
                // ======================================

                return L.marker(

                    latlng,

                    {

                        icon:
                            iconoParadero,

                        interactive:
                            false,

                        keyboard:
                            false

                    }

                );

            }

        }

    );


    // ======================================
    // ÁREA URBANA
    // ======================================

    capaLimiteUrbano = L.geoJSON(

        null,

        {

            interactive:false,

            style:function(){

                return {

                    color:"#005A9C",

                    weight:3,

                    opacity:0.9,

                    fillColor:"#005A9C",

                    fillOpacity:0.08

                };

            }

        }

    );


    // ======================================
    // MAPA SATELITAL POR DEFECTO
    // ======================================

    mapaSatelite.addTo(

        mapa

    );


    // ======================================
    // NOMBRES DE CALLES POR DEFECTO
    // ======================================

    nombresCallesEsri.addTo(

        mapa

    );


    // ======================================
    // CONTROL DE CAPAS
    // ======================================

    L.control.layers(

        {

            "🛰️ Satélite":
                mapaSatelite,

            "🗺️ Calles":
                mapaCalles

        },

        {

            "🚏 Paraderos":
                capaParaderos,

            "🏙️ Área urbana":
                capaLimiteUrbano

        },

        {

            position:"topright"

        }

    ).addTo(

        mapa

    );


    // ======================================
    // CARGAR PARADEROS
    // ======================================

    fetch(

        "data/Paraderos.geojson"

    )

    .then(

        respuesta => {

            if(!respuesta.ok){

                throw new Error(

                    "No fue posible cargar Paraderos.geojson"

                );

            }

            return respuesta.json();

        }

    )

    .then(

        datos => {

            capaParaderos.addData(

                datos

            );


            if(

                mapa.getZoom() >=
                zoomMinimoParaderos

            ){

                capaParaderos.addTo(

                    mapa

                );

            }

        }

    )

    .catch(

        error => {

            console.error(

                "Error cargando Paraderos.geojson:",

                error

            );

        }

    );


    // ======================================
    // CARGAR ÁREA URBANA
    // ======================================

    fetch(

        "data/Limite_urbano.geojson"

    )

    .then(

        respuesta => {

            if(!respuesta.ok){

                throw new Error(

                    "No fue posible cargar Limite_urbano.geojson"

                );

            }

            return respuesta.json();

        }

    )

    .then(

        datos => {

            capaLimiteUrbano.addData(

                datos

            );

            capaLimiteUrbano.addTo(

                mapa

            );

        }

    )

    .catch(

        error => {

            console.error(

                "Error cargando Limite_urbano.geojson:",

                error

            );

        }

    );


    // ======================================
    // MOSTRAR / OCULTAR PARADEROS
    // SEGÚN ZOOM
    // ======================================

    mapa.on(

        "zoomend",

        function(){

            if(!capaParaderos){

                return;

            }


            const zoomActual =
                mapa.getZoom();


            // ======================================
            // OCULTAR
            // ======================================

            if(

                zoomActual <
                zoomMinimoParaderos

            ){

                if(

                    mapa.hasLayer(
                        capaParaderos
                    )

                ){

                    mapa.removeLayer(

                        capaParaderos

                    );

                }

            }


            // ======================================
            // MOSTRAR
            // ======================================

            else{

                if(

                    !mapa.hasLayer(
                        capaParaderos
                    )

                ){

                    capaParaderos.addTo(

                        mapa

                    );

                }

            }

        }

    );


    // ======================================
    // CONTROLAR NOMBRES DE CALLES
    // SEGÚN MAPA BASE
    // ======================================

    mapa.on(

        "baselayerchange",

        function(evento){

            // ======================================
            // SATÉLITE
            // ======================================

            if(

                evento.name ===
                "🛰️ Satélite"

            ){

                if(

                    !mapa.hasLayer(
                        nombresCallesEsri
                    )

                ){

                    nombresCallesEsri.addTo(

                        mapa

                    );

                }

            }


            // ======================================
            // CALLES
            // ======================================

            if(

                evento.name ===
                "🗺️ Calles"

            ){

                if(

                    mapa.hasLayer(
                        nombresCallesEsri
                    )

                ){

                    mapa.removeLayer(

                        nombresCallesEsri

                    );

                }

            }

        }

    );

}


// ======================================
// CALCULAR LONGITUD APROXIMADA
// ======================================

function longitudLinea(coordenadas){

    if(

        !coordenadas ||

        coordenadas.length < 2

    ){

        return 0;

    }


    let longitud = 0;


    for(

        let i = 0;

        i < coordenadas.length - 1;

        i++

    ){

        const a = coordenadas[i];

        const b = coordenadas[i + 1];


        const dx =
            b[0] - a[0];

        const dy =
            b[1] - a[1];


        longitud += Math.sqrt(

            dx * dx +
            dy * dy

        );

    }


    return longitud;

}


// ======================================
// OBTENER PUNTO MEDIO DE UNA LÍNEA
// ======================================

function obtenerPuntoMedioLinea(coordenadas){

    if(

        !coordenadas ||

        coordenadas.length === 0

    ){

        return null;

    }


    if(

        coordenadas.length === 1

    ){

        return L.latLng(

            coordenadas[0][1],

            coordenadas[0][0]

        );

    }


    const longitudTotal =

        longitudLinea(

            coordenadas

        );


    const mitad =

        longitudTotal / 2;


    let acumulado = 0;


    for(

        let i = 0;

        i < coordenadas.length - 1;

        i++

    ){

        const a =
            coordenadas[i];

        const b =
            coordenadas[i + 1];


        const dx =
            b[0] - a[0];

        const dy =
            b[1] - a[1];


        const longitudSegmento =

            Math.sqrt(

                dx * dx +
                dy * dy

            );


        if(

            acumulado +
            longitudSegmento >=
            mitad

        ){

            const restante =

                mitad -
                acumulado;


            const proporcion =

                longitudSegmento === 0

                    ? 0

                    :

                    restante /
                    longitudSegmento;


            const lng =

                a[0] +
                (b[0] - a[0]) *
                proporcion;


            const lat =

                a[1] +
                (b[1] - a[1]) *
                proporcion;


            return L.latLng(

                lat,

                lng

            );

        }


        acumulado +=

            longitudSegmento;

    }


    const ultimo =

        coordenadas[
            coordenadas.length - 1
        ];


    return L.latLng(

        ultimo[1],

        ultimo[0]

    );

}


// ======================================
// OBTENER PUNTO DE ETIQUETA
// ======================================

function obtenerPuntoEtiqueta(geometria){

    if(!geometria){

        return null;

    }


    // ======================================
    // PUNTO
    // ======================================

    if(

        geometria.type ===
        "Point"

    ){

        return L.latLng(

            geometria.coordinates[1],

            geometria.coordinates[0]

        );

    }


    // ======================================
    // LÍNEA
    // ======================================

    if(

        geometria.type ===
        "LineString"

    ){

        return obtenerPuntoMedioLinea(

            geometria.coordinates

        );

    }


    // ======================================
    // MULTILÍNEA
    // ======================================

    if(

        geometria.type ===
        "MultiLineString"

    ){

        let lineaMasLarga = null;

        let longitudMayor = 0;


        geometria.coordinates.forEach(

            linea => {

                const longitud =

                    longitudLinea(

                        linea

                    );


                if(

                    longitud >
                    longitudMayor

                ){

                    longitudMayor =
                        longitud;

                    lineaMasLarga =
                        linea;

                }

            }

        );


        if(lineaMasLarga){

            return obtenerPuntoMedioLinea(

                lineaMasLarga

            );

        }

    }


    // ======================================
    // FALLBACK
    // ======================================

    const capaTemporal =

        L.geoJSON(

            geometria

        );


    const limites =

        capaTemporal.getBounds();


    if(

        limites.isValid()

    ){

        return limites.getCenter();

    }


    return null;

}


// ======================================
// CREAR ICONO DEL PROYECTO
// ======================================

function crearIconoProyecto(proyecto){

    const color =

        obtenerColorCategoria(

            proyecto.categoria

        );


    // ======================================
    // OBTENER NÚMERO
    // ======================================

    let numero =

        proyecto.codigo ||
        proyecto.id;


    if(

        String(numero).includes("-")

    ){

        numero =

            String(numero)
                .split("-")
                .pop();

    }


    // ======================================
    // CREAR ICONO
    // ======================================

    return L.divIcon({

        className:
            "icono-proyecto",

        html:`

            <div
                class="etiqueta-proyecto"
                style="
                    background-color:${color};
                "
            >

                ${numero}

            </div>

        `,

        iconSize:[

            32,

            22

        ],

        iconAnchor:[

            16,

            11

        ]

    });

}


// ======================================
// RESTAURAR PROYECTO ANTERIOR
// ======================================

function restaurarProyectoAnterior(){

    // ======================================
    // RESTAURAR BORDE
    // ======================================

    if(capaBordeSeleccionado){

        capaBordeSeleccionado.setStyle({

            color:
                "#FFFFFF",

            weight:
                8,

            opacity:
                0.55

        });

    }


    // ======================================
    // RESTAURAR LÍNEA
    // ======================================

    if(capaProyectoSeleccionado){

        const proyectoAnterior =

            capaProyectoSeleccionado._proyectoPIIMEP;


        const colorAnterior =

            obtenerColorCategoria(

                proyectoAnterior?.categoria

            );


        capaProyectoSeleccionado.setStyle({

            color:
                colorAnterior,

            weight:
                5,

            opacity:
                0.55

        });

    }


    // ======================================
    // LIMPIAR REFERENCIAS
    // ======================================

    capaProyectoSeleccionado = null;

    capaBordeSeleccionado = null;

    proyectoSeleccionado = null;

}


// ======================================
// AGREGAR PROYECTOS AL MAPA
// ======================================

function agregarProyectosMapa(){

    // ======================================
    // VERIFICAR MAPA
    // ======================================

    if(!mapa){

        console.warn(

            "El mapa todavía no ha sido inicializado."

        );

        return;

    }


    
    // ======================================
    // ELIMINAR TODAS LAS CAPAS ANTERIORES
    // ======================================

    capasProyectos.forEach(capa => {
        if (mapa.hasLayer(capa)) {
            mapa.removeLayer(capa);
        }
    });

    capasProyectos = [];
    marcadores = [];



    // ======================================
    // LIMPIAR SELECCIÓN
    // ======================================

    capaProyectoSeleccionado = null;

    capaBordeSeleccionado = null;

    proyectoSeleccionado = null;


    // ======================================
    // VERIFICAR PROYECTOS
    // ======================================

    if(

        !Array.isArray(
            proyectosUsuario
        )

    ){

        console.warn(

            "proyectosUsuario no es un arreglo."

        );

        return;

    }


    // ======================================
    // RECORRER PROYECTOS
    // ======================================

    proyectosUsuario.forEach(

        proyecto => {


            // ======================================
            // VERIFICAR GEOMETRÍA
            // ======================================

            if(

                !proyecto.geometria

            ){

                console.warn(

                    "Proyecto sin geometría:",

                    proyecto.codigo

                );

                return;

            }


            // ======================================
            // GEOMETRÍA LIMPIA
            // ======================================

            const geometria = {

                type:
                    proyecto.geometria.type,

                coordinates:
                    proyecto.geometria.coordinates

            };


            console.log(

                "Dibujando:",

                proyecto.codigo,

                geometria.type

            );


            // ======================================
            // COLOR
            // ======================================

            const color =

                obtenerColorCategoria(

                    proyecto.categoria

                );


            // ======================================
            // CAPA DE BORDE
            // ======================================

            const capaBorde =

                L.geoJSON(

                    geometria,

                    {

                        style:function(){

                            return {

                                color:
                                    "#FFFFFF",

                                weight:
                                    8,

                                opacity:
                                    0.55,

                                lineCap:
                                    "round",

                                lineJoin:
                                    "round"

                            };

                        },

                        pointToLayer:
                            function(

                                feature,

                                latlng

                            ){

                                return L.circleMarker(

                                    latlng,

                                    {

                                        radius:
                                            10,

                                        fillColor:
                                            color,

                                        color:
                                            "#FFFFFF",

                                        weight:
                                            3,

                                        opacity:
                                            1,

                                        fillOpacity:
                                            1

                                    }

                                );

                            }

                    }

                );


            // ======================================
            // GUARDAR REFERENCIA
            // ======================================

            capaBorde._proyectoPIIMEP =
                proyecto;


            // ======================================
            // CAPA PRINCIPAL
            // ======================================

            const capaProyecto =

                L.geoJSON(

                    geometria,

                    {

                        style:function(){

                            return {

                                color:
                                    color,

                                weight:
                                    5,

                                opacity:
                                    0.55,

                                lineCap:
                                    "round",

                                lineJoin:
                                    "round"

                            };

                        },

                        pointToLayer:
                            function(

                                feature,

                                latlng

                            ){

                                return L.circleMarker(

                                    latlng,

                                    {

                                        radius:
                                            7,

                                        fillColor:
                                            color,

                                        color:
                                            "#FFFFFF",

                                        weight:
                                            2,

                                        opacity:
                                            1,

                                        fillOpacity:
                                            0.95

                                    }

                                );

                            }

                    }

                );


            // ======================================
            // GUARDAR REFERENCIA
            // ======================================

            capaProyecto._proyectoPIIMEP =
                proyecto;


            // ======================================
            // CLICK EN BORDE
            // ======================================

            capaBorde.on(

                "click",

                function(){

                    seleccionarProyecto(

                        proyecto

                    );

                }

            );


            // ======================================
            // CLICK EN GEOMETRÍA
            // ======================================

            capaProyecto.on(

                "click",

                function(){

                    seleccionarProyecto(

                        proyecto

                    );

                }

            );


            // ======================================
            // AGREGAR BORDE
            // ======================================

            capaBorde.addTo(

                mapa

            );

            capasProyectos.push(capaBorde);

            // ======================================
            // AGREGAR PROYECTO
            // ======================================

            capaProyecto.addTo(

                mapa

            );

            capasProyectos.push(capaProyecto);

            // ======================================
            // PUNTO DE ETIQUETA
            // ======================================

            const centro =

                obtenerPuntoEtiqueta(

                    geometria

                );


            if(!centro){

                console.warn(

                    "No fue posible ubicar etiqueta:",

                    proyecto.codigo

                );

                return;

            }


            // ======================================
            // CREAR MARCADOR
            // ======================================

            const marcador =

                L.marker(

                    centro,

                    {

                        icon:
                            crearIconoProyecto(
                                proyecto
                            ),

                        zIndexOffset:
                            1000

                    }

                );


            // ======================================
            // REFERENCIAS DIRECTAS
            // ======================================

            marcador._proyectoPIIMEP =
                proyecto;

            marcador._capaBorde =
                capaBorde;

            marcador._capaProyecto =
                capaProyecto;


            // ======================================
            // CLICK EN MARCADOR
            // ======================================

            marcador.on(

                "click",

                function(){

                    seleccionarProyecto(

                        proyecto

                    );

                }

            );


            // ======================================
            // AGREGAR MARCADOR
            // ======================================

            marcador.addTo(

                mapa

            );

            capasProyectos.push(marcador);

            // ======================================
            // GUARDAR MARCADOR
            // ======================================

            marcadores.push(

                marcador

            );

        }

    );


    // ======================================
    // AJUSTAR VISTA
    // ======================================

    if(

        marcadores.length > 0

    ){

        const grupo =

            L.featureGroup(

                marcadores

            );


        const limites =

            grupo.getBounds();


        console.log(

            "Extensión proyectos:",

            limites

        );


        if(

            limites.isValid()

        ){

            mapa.fitBounds(

                limites,

                {

                    padding:[

                        50,

                        50

                    ]

                }

            );


            vistaInicial =

                mapa.getBounds();

        }

    }

}


// ======================================
// SELECCIONAR PROYECTO
// ======================================

function seleccionarProyecto(

    proyecto

){

    // ======================================
    // VERIFICAR
    // ======================================

    if(

        !proyecto ||

        !proyecto.geometria

    ){

        return;

    }


    // ======================================
    // SI YA HAY OTRO SELECCIONADO
    // RESTAURARLO
    // ======================================

    if(

        proyectoSeleccionado &&
        proyectoSeleccionado !== proyecto

    ){

        restaurarProyectoAnterior();

    }


    // ======================================
    // BUSCAR MARCADOR DEL PROYECTO
    // ======================================

    const marcadorProyecto =

        marcadores.find(

            marcador =>

                marcador instanceof L.Marker &&

                marcador._proyectoPIIMEP ===
                proyecto

        );


    // ======================================
    // VERIFICAR
    // ======================================

    if(!marcadorProyecto){

        console.warn(

            "No se encontraron las referencias del proyecto:",

            proyecto.codigo

        );

        return;

    }


    // ======================================
    // OBTENER CAPAS DIRECTAMENTE
    // ======================================

    capaBordeSeleccionado =

        marcadorProyecto._capaBorde;


    capaProyectoSeleccionado =

        marcadorProyecto._capaProyecto;


    // ======================================
    // GUARDAR PROYECTO
    // ======================================

    proyectoSeleccionado =
        proyecto;


    // ======================================
    // COLOR
    // ======================================

    const color =

        obtenerColorCategoria(

            proyecto.categoria

        );


    // ======================================
    // RESALTAR BORDE
    // ======================================

    if(capaBordeSeleccionado){

        capaBordeSeleccionado.setStyle({

            color:
                "#FFFFFF",

            weight:
                14,

            opacity:
                1

        });

        capaBordeSeleccionado.bringToFront();

    }


    // ======================================
    // RESALTAR LÍNEA
    // ======================================

    if(capaProyectoSeleccionado){

        capaProyectoSeleccionado.setStyle({

            color:
                color,

            weight:
                11,

            opacity:
                1

        });

        capaProyectoSeleccionado.bringToFront();

    }


    // ======================================
    // MOSTRAR DETALLE
    // ======================================

    mostrarDetalleProyecto(

        proyecto

    );


    // ======================================
    // GEOMETRÍA LIMPIA
    // ======================================

    const geometria = {

        type:
            proyecto.geometria.type,

        coordinates:
            proyecto.geometria.coordinates

    };


    // ======================================
    // CREAR CAPA TEMPORAL
    // ======================================

    const capa =

        L.geoJSON(

            geometria

        );


    // ======================================
    // OBTENER EXTENSIÓN
    // ======================================

    const limites =

        capa.getBounds();


    // ======================================
    // ACERCAR AL PROYECTO
    // ======================================

    if(

        limites.isValid()

    ){

        mapa.fitBounds(

            limites,

            {

                padding:[

                    80,

                    80

                ],

                maxZoom:17

            }

        );

    }

}


// ======================================
// VOLVER A VISTA INICIAL
// ======================================

function volverVistaInicial(){

    // ======================================
    // RESTAURAR PROYECTO
    // ======================================

    restaurarProyectoAnterior();


    // ======================================
    // VOLVER A VISTA GENERAL
    // ======================================

    if(

        vistaInicial &&

        vistaInicial.isValid()

    ){

        mapa.fitBounds(

            vistaInicial,

            {

                padding:[

                    50,

                    50

                ]

            }

        );

    }

    else{

        mapa.setView(

            centroInicial,

            zoomInicial

        );

    }


    // ======================================
    // CERRAR DETALLE
    // ======================================

    cerrarDetalleProyecto();

}