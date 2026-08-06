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

let vistaUV = null;


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

        [-33.005, -71.184],

        14

    );

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





    const mapaSatelite = L.tileLayer(

        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

        {

            attribution:
            "Tiles &copy; Esri"

        }

    );





    // Vista inicial satélite


    mapaSatelite.addTo(mapa);





    L.control.layers(

    {

        "🛰️ Satélite": mapaSatelite,

        "🗺️ Calles": mapaCalles

    },

    null,

    {

        position: "topright"

    }

).addTo(mapa);



}






// ======================================
// AGREGAR PROYECTOS AL MAPA
// ======================================


function agregarProyectosMapa(){



    // limpiar marcadores anteriores


    marcadores.forEach(

        marcador => {

            mapa.removeLayer(
                marcador
            );

        }

    );


    marcadores=[];





    proyectosUsuario.forEach(

        proyecto => {



            const marcador = L.marker(

                [

                    proyecto.lat,

                    proyecto.lng

                ]

            );





            marcador.addTo(mapa);





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





    // Ajustar vista si existen proyectos


   if(marcadores.length > 0){


    const grupo = L.featureGroup(

        marcadores

    );


    mapa.fitBounds(

        grupo.getBounds(),

        {

            padding:[50,50]

        }

    );


    vistaUV = mapa.getBounds();


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


    mapa.setView(

    [-33.005,-71.184],

    14

);



    cerrarDetalleProyecto();


}