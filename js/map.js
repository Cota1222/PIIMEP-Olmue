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

let vistaInicial = null;


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


            // Mostrar solamente si
            // estamos en el zoom adecuado

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
            // ZOOM ALEJADO
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
            // ZOOM CERCANO
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
    // LIMPIAR PROYECTOS ANTERIORES
    // ======================================

    marcadores.forEach(

        marcador => {

            if(

                mapa.hasLayer(
                    marcador
                )

            ){

                mapa.removeLayer(

                    marcador

                );

            }

        }

    );


    marcadores = [];


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
    // AGREGAR PROYECTOS
    // ======================================

    proyectosUsuario.forEach(

        proyecto => {


            // ======================================
            // VERIFICAR COORDENADAS
            // ======================================

            if(

                proyecto.lat === undefined ||

                proyecto.lng === undefined ||

                proyecto.lat === null ||

                proyecto.lng === null

            ){

                console.warn(

                    "Proyecto sin coordenadas:",

                    proyecto

                );

                return;

            }


            // ======================================
            // CREAR MARCADOR
            // ======================================

            const marcador =

                L.marker(

                    [

                        proyecto.lat,

                        proyecto.lng

                    ]

                );


            // ======================================
            // AGREGAR AL MAPA
            // ======================================

            marcador.addTo(

                mapa

            );


            // ======================================
            // CLICK
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


        mapa.fitBounds(

            grupo.getBounds(),

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


// ======================================
// SELECCIONAR PROYECTO
// ======================================

function seleccionarProyecto(

    proyecto

){

    // ======================================
    // VERIFICAR COORDENADAS
    // ======================================

    if(

        proyecto.lat === undefined ||

        proyecto.lng === undefined

    ){

        return;

    }


    // ======================================
    // CENTRAR MAPA
    // ======================================

    mapa.setView(

        [

            proyecto.lat,

            proyecto.lng

        ],

        17

    );


    // ======================================
    // MOSTRAR DETALLE
    // ======================================

    mostrarDetalleProyecto(

        proyecto

    );

}


// ======================================
// VOLVER A VISTA INICIAL
// ======================================

function volverVistaInicial(){


    // ======================================
    // VOLVER A PROYECTOS
    // ======================================

    if(

        vistaInicial &&

        marcadores.length > 0

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


    // ======================================
    // VISTA GENERAL
    // ======================================

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