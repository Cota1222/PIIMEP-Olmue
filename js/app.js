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

    nombre: null,

    direccion: null,

    rut: null

};



// ======================================
// INICIALIZAR APLICACIÓN
// ======================================

document.addEventListener(

    "DOMContentLoaded",

    function(){

        iniciarFormulario();

        controlarBotonIngresar();

    }

);



// ======================================
// FORMULARIO DE INGRESO
// ======================================

function iniciarFormulario(){

    const formulario =
        document.getElementById(
            "formulario-ingreso"
        );


    if(!formulario){

        return;

    }


    formulario.addEventListener(

        "submit",

        function(event){

            event.preventDefault();


            const nombre =
                document.getElementById(
                    "nombre"
                ).value.trim();


            const direccion =
                document.getElementById(
                    "direccion"
                ).value.trim();



            // ======================================
            // VALIDAR DATOS
            // ======================================

            if(nombre === ""){

                mostrarMensaje(
                    "⚠️ Falta información",
                    "Ingrese su nombre para continuar."
                );

                return;

            }


            if(direccion === ""){

                mostrarMensaje(
                    "⚠️ Falta información",
                    "Ingrese su dirección para continuar."
                );

                return;

            }



            // ======================================
            // GUARDAR USUARIO
            // ======================================

            usuarioActual.nombre =
                nombre;


            usuarioActual.direccion =
                direccion;



            // ======================================
            // INGRESAR A LA PLATAFORMA
            // ======================================

            ingresarPlataforma();

        }

    );

}



// ======================================
// INGRESAR A LA PLATAFORMA
// ======================================

function ingresarPlataforma(){

    // ======================================
    // OCULTAR PÁGINA INFORMATIVA
    // ======================================

    const pantallaInformativa =
        document.getElementById(
            "pantalla-informativa"
        );


    if(pantallaInformativa){

        pantallaInformativa.classList.add(
            "oculto"
        );

    }



    // ======================================
    // MOSTRAR APLICACIÓN
    // ======================================

    const aplicacion =
        document.getElementById(
            "aplicacion"
        );


    aplicacion.classList.remove(
        "oculto"
    );



    // ======================================
    // MOSTRAR USUARIO
    // ======================================

    mostrarUsuario();



    // ======================================
    // INICIALIZAR MAPA
    // ======================================

    inicializarMapa();



    // ======================================
    // CARGAR PROYECTOS
    // ======================================

    cargarProyectos();

}



// ======================================
// MOSTRAR USUARIO
// ======================================

function mostrarUsuario(){

    const elemento =
        document.getElementById(
            "usuario-activo"
        );


    if(!elemento){

        return;

    }


    elemento.innerHTML = `

        ${usuarioActual.nombre || "Vecino"}

        -

        ${usuarioActual.direccion || ""}

    `;

}



// ======================================
// IR AL FORMULARIO
// ======================================

function irAFormulario(){

    const formulario =
        document.getElementById(
            "seccion-participar"
        );


    if(!formulario){

        return;

    }


    formulario.scrollIntoView({

        behavior:"smooth",

        block:"start"

    });

}



// ======================================
// CONTROLAR BOTÓN FLOTANTE
// ======================================

function controlarBotonIngresar(){

    const boton =
        document.getElementById(
            "boton-ingresar"
        );


    const formulario =
        document.getElementById(
            "seccion-participar"
        );


    if(!boton || !formulario){

        return;

    }


    const observer =
        new IntersectionObserver(

            function(entries){

                const visible =
                    entries[0].isIntersecting;


                if(visible){

                    boton.classList.add(
                        "oculto"
                    );

                }
                else{

                    boton.classList.remove(
                        "oculto"
                    );

                }

            },

            {

                threshold:0.25

            }

        );


    observer.observe(formulario);

}