/*
========================================================

PIIMEP Participa

Archivo:
app.js

Descripción:
Control principal de la aplicación.
Gestiona el ingreso del usuario
y el inicio de la plataforma.

========================================================
*/


// ======================================
// VARIABLES GLOBALES
// ======================================


let usuarioActual = {

    nombre:null,

    unidad:null,

    rut:null

};





// ======================================
// INICIALIZAR APLICACIÓN
// ======================================


document.addEventListener(
    
    "DOMContentLoaded",

    function(){


        iniciarFormulario();


    }

);

document
.getElementById("cambiar-uv")
.onclick = function(){

    console.log("Botón cambiar UV funcionando");

    cambiarUnidad();

};




// ======================================
// FORMULARIO DE INGRESO
// ======================================


function iniciarFormulario(){


    const formulario = document.getElementById(
        "formulario-ingreso"
    );


    formulario.addEventListener(
        
        "submit",

        function(event){


            event.preventDefault();



            const nombre = document.getElementById(
                "nombre"
            ).value;



            const unidad = document.getElementById(
                "unidad"
            ).value;



            if(unidad === ""){


                alert(
                    "Seleccione una Unidad Vecinal"
                );


                return;


            }



            usuarioActual.nombre = nombre;

            usuarioActual.unidad = unidad;



            ingresarPlataforma();



        }

    );


}






// ======================================
// CAMBIAR A LA PLATAFORMA
// ======================================


function ingresarPlataforma(){


    document
    .getElementById(
        "pantalla-ingreso"
    )
    .style.display="none";



    document
    .getElementById(
        "aplicacion"
    )
    .classList.remove(
        "oculto"
    );



    mostrarUsuario();
    
    inicializarMapa();

    cargarProyectos();

}




// ======================================
// MOSTRAR USUARIO
// ======================================


function mostrarUsuario(){


    const elemento = document.getElementById(
        "usuario-activo"
    );


    elemento.innerHTML = `

        ${usuarioActual.nombre || "Vecino"}

        -
        
        Unidad Vecinal ${usuarioActual.unidad}

    `;


}
