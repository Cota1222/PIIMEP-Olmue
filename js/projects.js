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


    filtrarProyectos();


}

async function cargarVotos(){


    const { data, error } = await supabaseClient
    .from("Votos")
    .select("proyecto_id");


    if(error){

        console.error(error);

        return;

    }

console.log(
    "Votos desde Supabase:",
    data
);

    proyectos.forEach(proyecto => {


        proyecto.votos = data.filter(

            voto => voto.proyecto_id == proyecto.id

        ).length;


    });


}



// ======================================
// FILTRAR POR UNIDAD VECINAL
// ======================================


function filtrarProyectos(){


    proyectosUsuario = proyectos.filter(

        proyecto =>

        proyecto.unidad == usuarioActual.unidad

    );

if(proyectosUsuario.length === 0){

    console.log(
        "No existen proyectos para esta Unidad Vecinal"
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


    selector.innerHTML = `

        <option value="">
            Seleccione un proyecto
        </option>

    `;



    proyectosUsuario.forEach(

        proyecto => {


            const opcion = document.createElement(
                "option"
            );


            opcion.value = proyecto.id;


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



        const proyecto = proyectosUsuario.find(

            p => p.id == id

        );



        if(proyecto){


            seleccionarProyecto(

                proyecto

            );


        }


    };


}
// ======================================
// PROYECTO DESTACADO
// ======================================


function mostrarProyectosMasVotados(){


    const contenedor = document.getElementById(
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




    const ranking = [...proyectosUsuario]

    .sort(

        (a,b)=>b.votos-a.votos

    )

    .slice(0,3);





    contenedor.innerHTML = ranking.map(

        (proyecto,index)=>{


            let posicion = index + 1;



           return `


<div class="ranking-item"
onclick="abrirProyectoRanking(${proyecto.id})">


    <div class="ranking-numero">

        ${posicion}

    </div>



    <div class="ranking-contenido">


        <h3>

            ${proyecto.nombre}

        </h3>


        <p>

            ✅ ${proyecto.votos}

            votos

        </p>


    </div>


</div>


`;


        }

    ).join("");



}
function abrirProyectoRanking(id){


    const proyecto = proyectosUsuario.find(

        p => p.id == id

    );


    if(proyecto){

        seleccionarProyecto(
            proyecto
        );

    }


}