/*
========================================================

PIIMEP Participa

Archivo:
projects.js

Descripción:
Carga y administra los proyectos PIIMEP.

========================================================
*/


let proyectos = [];


let proyectosUsuario = [];

// ======================================
// FORMATEAR NOMBRE DEL PROYECTO
// ======================================

function formatearNombreProyecto(nombre){

    if(!nombre){

        return "Proyecto sin nombre";

    }

    const palabrasMinusculas = [
        "de",
        "del",
        "la",
        "las",
        "el",
        "los",
        "y",
        "en",
        "a"
    ];


    return nombre
        .toLowerCase()
        .split(/\s+/)
        .map((palabra, indice) => {

            if(
                indice > 0 &&
                palabrasMinusculas.includes(palabra)
            ){

                return palabra;

            }

            return palabra.charAt(0).toUpperCase() +
                   palabra.slice(1);

        })
        .join(" ");

}


// ======================================
// FORMATO COMPLETO DEL PROYECTO
// ======================================

function nombreCompletoProyecto(proyecto){

    const codigo =
        proyecto.codigo ||
        `PIIMEP-${String(proyecto.id).padStart(3,"0")}`;


    const nombre =
        formatearNombreProyecto(
            proyecto.nombre
        );


    return `${codigo} · ${nombre}`;

}

// ======================================
// CARGAR PROYECTOS
// ======================================

async function cargarProyectos(){

    const { data, error } = await supabaseClient
        .from("Proyectos")
        .select(`
            id,
            codigo,
            nombre,
            unidad,
            categoria,
            subcategoria,
            descripcion,
            estado,
            lat,
            long,
            tipo_geometria,
            geometria
        `)
        .order("id", {
            ascending:true
        });


    if(error){

        console.error(
            "Error cargando proyectos:",
            error
        );

        return;

    }


    console.log(
        "Proyectos desde Supabase:",
        data
    );


    proyectos = data.map(

        proyecto => {

            let geometria = null;


            // ======================================
            // CONVERTIR GEOMETRÍA POSTGIS
            // ======================================

            if(proyecto.geometria){

                try{

                    geometria =
                        typeof proyecto.geometria === "string"

                            ? JSON.parse(
                                proyecto.geometria
                            )

                            : proyecto.geometria;

                }

                catch(error){

                    console.error(
                        "Error interpretando geometría:",
                        proyecto.codigo,
                        error
                    );

                }

            }


            return {

                ...proyecto,

                lng: proyecto.long,

                geometria: geometria

            };

        }

    );


    // ======================================
    // CARGAR VOTOS
    // ======================================

    await cargarVotos();


    // ======================================
    // MOSTRAR PROYECTOS
    // ======================================

    mostrarTodosLosProyectos();

}


// ======================================
// CARGAR VOTOS
// ======================================

async function cargarVotos(){

    const { data, error } = await supabaseClient
        .from("Votos")
        .select("proyecto_id");


    if(error){

        console.error(
            "Error cargando votos:",
            error
        );

        return;

    }



    console.log(
        "Votos desde Supabase:",
        data
    );



    proyectos.forEach(

        proyecto => {

            proyecto.votos = data.filter(

                voto =>
                    voto.proyecto_id == proyecto.id

            ).length;

        }

    );

}



// ======================================
// MOSTRAR TODOS LOS PROYECTOS
// ======================================

function mostrarTodosLosProyectos(){

    /*
    ====================================================
    Antes:
    proyectosUsuario se filtraba por Unidad Vecinal.

    Ahora:
    todos los proyectos de la comuna están disponibles
    para el usuario.
    ====================================================
    */


    proyectosUsuario = [...proyectos];



    if(proyectosUsuario.length === 0){

        console.log(
            "No existen proyectos disponibles."
        );

    }



    mostrarProyectosMasVotados();


    mostrarProyectos();


    agregarProyectosMapa();

}



// ======================================
// LISTADO LATERAL
// ======================================

function mostrarProyectos(){

    const selector = document.getElementById(
        "selector-proyectos"
    );


    if(!selector){

        return;

    }



    selector.innerHTML = `

        <option value="">
            Seleccione un proyecto
        </option>

    `;



    proyectosUsuario.forEach(

        proyecto => {

            const opcion =
                document.createElement(
                    "option"
                );


            opcion.value =
                proyecto.id;


            opcion.textContent =
    nombreCompletoProyecto(
        proyecto
    );


            selector.appendChild(
                opcion
            );

        }

    );



    selector.onchange = function(){

        const id = this.value;



        if(id === ""){

            volverVistaInicial();

            return;

        }



        const proyecto =
            proyectosUsuario.find(

                p =>
                    p.id == id

            );



        if(proyecto){

            seleccionarProyecto(
                proyecto
            );

        }

    };

}



// ======================================
// TOP 5 PROYECTOS MÁS VOTADOS
// ======================================

function mostrarProyectosMasVotados(){

    const contenedor =
        document.getElementById(
            "destacado"
        );


    if(!contenedor){

        return;

    }



    if(proyectosUsuario.length === 0){

        contenedor.innerHTML = `

            <p>
                No existen proyectos disponibles.
            </p>

        `;

        return;

    }



    /*
    ====================================================
    ORDENAR TODOS LOS PROYECTOS
    POR CANTIDAD DE VOTOS
    ====================================================
    */

    const ranking = [...proyectosUsuario]

        .sort(

            (a,b) =>
                (b.votos || 0) -
                (a.votos || 0)

        )

        .slice(0,5);



    contenedor.innerHTML = ranking.map(

        (proyecto,index) => {

            const posicion =
                index + 1;


            return `

                <div
                    class="ranking-item"
                    onclick="abrirProyectoRanking(${proyecto.id})"
                >

                    <div class="ranking-numero">

                        ${posicion}

                    </div>


                    <div class="ranking-contenido">

                        <div class="ranking-codigo">
    ${proyecto.codigo || `PIIMEP-${String(proyecto.id).padStart(3,"0")}`}
</div>

<div class="ranking-nombre">
    ${formatearNombreProyecto(proyecto.nombre)}
</div>


                        <p>

                            ✅ ${proyecto.votos || 0}
                            votos

                        </p>

                    </div>

                </div>

            `;

        }

    ).join("");

}



// ======================================
// ABRIR PROYECTO DESDE EL RANKING
// ======================================

function abrirProyectoRanking(id){

    const proyecto =
        proyectosUsuario.find(

            p =>
                p.id == id

        );


    if(proyecto){

        seleccionarProyecto(
            proyecto
        );

    }

}