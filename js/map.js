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
// INICIALIZAR MAPA
// ======================================

function inicializarMapa(){

    if(mapa !== null){

        mapa.invalidateSize();

        return;

    }


    mapa = L.map(

        "mapa",

        {

            zoomControl:false

        }

    );


    mapa.setView(

        [-33.005,-71.184],

        14

    );


    // ======================================
    // CONTROL ZOOM
    // ======================================

    L.control.zoom({

        position:"topright"

    }).addTo(mapa);


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

                feature.properties?.Paraderos ||

                "Paradero";


            // ======================================
            // OBTENER NÚMERO
            // ======================================

            const coincidencia =

                nombre.match(/\d+/);


            const numero =

                coincidencia

                    ? coincidencia[0]

                    : "P";


            // ======================================
            // ICONO PARADERO
            // ======================================

            const iconoParadero =

                L.divIcon({

                    className:
                        "icono-paradero",

                    html:`

    <div class="paradero-senal">

        <svg
            class="icono-bus"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
        >

            <!-- BUS COMPLETAMENTE BLANCO -->

            <path
                fill="#ffffff"
                d="
                    M16 6
                    C10 6 7 10 7 16
                    V46
                    C7 50 10 53 14 53
                    H50
                    C54 53 57 50 57 46
                    V16
                    C57 10 54 6 48 6
                    Z
                "
            />


            <!-- PARABRISAS -->

            <rect
                x="13"
                y="13"
                width="38"
                height="14"
                rx="3"
                fill="#005A9C"
            />


            <!-- DIVISIÓN DEL PARABRISAS -->

            <rect
                x="30"
                y="13"
                width="4"
                height="14"
                fill="#ffffff"
            />


            <!-- FRENTE INFERIOR -->

            <rect
                x="13"
                y="32"
                width="38"
                height="7"
                rx="2"
                fill="#005A9C"
            />


            <!-- FAROS -->

            <circle
                cx="19"
                cy="44"
                r="3"
                fill="#005A9C"
            />

            <circle
                cx="45"
                cy="44"
                r="3"
                fill="#005A9C"
            />


            <!-- RUEDAS -->

            <circle
                cx="14"
                cy="51"
                r="5"
                fill="#ffffff"
            />

            <circle
                cx="50"
                cy="51"
                r="5"
                fill="#ffffff"
            />

        </svg>


        <span class="numero-paradero">

            ${numero}

        </span>

    </div>

`,

                    iconSize:[

                        12,

                        16

                    ],

                    iconAnchor:[

                        6,

                        8

                    ]

                });


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


        // Encender al iniciar

        capaParaderos.addTo(

            mapa

        );

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

                fillOpacity:0.08,

                interactive:false

            };

        }

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


        // Encender al iniciar

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
    // SATÉLITE POR DEFECTO
    // ======================================

    mapaSatelite.addTo(

        mapa

    );


    nombresCallesEsri.addTo(

        mapa

    );

    capaParaderos.addTo(

        mapa

    );


    capaLimiteUrbano.addTo(

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
    // CONTROLAR NOMBRES DE CALLES
    // SEGÚN MAPA BASE
    // ======================================

    mapa.on(

        "baselayerchange",

        function(evento){

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
    // LIMPIAR PROYECTOS ANTERIORES
    // ======================================

    marcadores.forEach(

        marcador => {

            mapa.removeLayer(

                marcador

            );

        }

    );


    marcadores = [];


    // ======================================
    // AGREGAR PROYECTOS
    // ======================================

    proyectosUsuario.forEach(

        proyecto => {


            const marcador =

                L.marker(

                    [

                        proyecto.lat,

                        proyecto.lng

                    ]

                );


            marcador.addTo(

                mapa

            );


            marcador.on(

                "click",

                function(){

                    seleccionarProyecto(

                        proyecto

                    );

                }

            );


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

    mapa.setView(

        [

            proyecto.lat,

            proyecto.lng

        ],

        17

    );


    mostrarDetalleProyecto(

        proyecto

    );

}


// ======================================
// VOLVER A VISTA INICIAL
// ======================================

function volverVistaInicial(){

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

    else{

        mapa.setView(

            [

                -33.005,

                -71.184

            ],

            14

        );

    }


    cerrarDetalleProyecto();

}