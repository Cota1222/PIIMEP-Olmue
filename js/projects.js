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
// CARGAR PROYECTOS
// ======================================

async function cargarProyectos(){

    const { data, error } = await supabaseClient
        .from("Proyectos")
        .select("*");


    if(error){

        console.error(
            "Error cargando proyectos:",
            error
        );

        return;

    }



    proyectos = data.map(proyecto => {

        return {

            ...proyecto,

            lng: proyecto.long

        };

    });



    await cargarVotos();


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
                proyecto.nombre;


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

                        <h3>

                            ${proyecto.nombre}

                        </h3>


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