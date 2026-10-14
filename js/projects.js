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

    let data;

    try {

        data = await obtenerProyectos();

    } catch(error) {

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


async function cargarVotos() {
    try {
        const conteos = await obtenerConteosVotos();

        proyectos.forEach(proyecto => {
            proyecto.votos = Number(
                conteos[String(proyecto.id)] ?? 0
            );
        });

        console.log("Conteos de votos cargados:", conteos);

    } catch (error) {
        console.error("Error obteniendo conteos de votos:", error);
        
        // No inventamos conteos si falla la consulta.
        proyectos.forEach(proyecto => {
            proyecto.votos = null;
        });
    }
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
        document.getElementById("destacado");

    if(!contenedor){
        return;
    }

    if(proyectosUsuario.length === 0){

        contenedor.innerHTML = `
            <p>No existen proyectos disponibles.</p>
        `;

        return;
    }

    // ======================================
    // VERIFICAR DISPONIBILIDAD DE LOS VOTOS
    // ======================================

    const votosDisponibles =
        proyectosUsuario.every(
            proyecto =>
                Number.isFinite(proyecto.votos)
        );

    if(!votosDisponibles){

        contenedor.innerHTML = `
            <p>
                No fue posible cargar los votos.
                Intenta actualizar la página.
            </p>
        `;

        return;
    }

    // ======================================
    // ORDENAR PROYECTOS POR VOTOS
    // ======================================

    const ranking = [...proyectosUsuario]
        .sort(
            (a,b) => b.votos - a.votos
        )
        .slice(0,5);

    // ======================================
    // MOSTRAR TOP 5
    // ======================================

    contenedor.innerHTML = ranking.map(
        (proyecto,index) => {

            const posicion = index + 1;

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
                            ✅ ${proyecto.votos}
                            ${proyecto.votos === 1 ? "voto" : "votos"}
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