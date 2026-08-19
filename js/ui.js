/*
========================================================

PIIMEP Participa

Archivo:
ui.js

Descripción:
Controla elementos visuales de la plataforma.

========================================================
*/


// ======================================
// MOSTRAR DETALLE PROYECTO
// ======================================

async function mostrarDetalleProyecto(proyecto){

    const detalle =
        document.getElementById(
            "detalle-proyecto"
        );


    if(!detalle){

        return;

    }



    // ======================================
    // BOTÓN DE VOTACIÓN
    // ======================================

    let botonVoto = `

        <button
            class="boton-votar"
            onclick="abrirVotacion(${proyecto.id})"
        >

            🗳️ Votar por este proyecto

        </button>

    `;



    // ======================================
    // VERIFICAR SI EL USUARIO YA VOTÓ
    // ======================================

    if(usuarioActual.rut){

        const yaVoto =
            await validarVoto(
                usuarioActual.rut
            );


        if(yaVoto){

            botonVoto = `

                <button
                    class="boton-votar votado"
                    disabled
                >

                    Ya participaste

                </button>

            `;

        }

    }



    // ======================================
    // MOSTRAR INFORMACIÓN
    // ======================================

    detalle.innerHTML = `

        <button
            class="cerrar-detalle"
            onclick="volverVistaInicial()"
        >

            ✕

        </button>


        <h2>

            ${proyecto.nombre}

        </h2>


        <span class="categoria">

            ${proyecto.categoria || "Proyecto"}

        </span>


        <p>

            ${proyecto.descripcion || ""}

        </p>


        <div class="estado">

            Estado:

            <strong>

                ${proyecto.estado || "Propuesta"}

            </strong>

        </div>


        <div class="votos">

            ✅ ${proyecto.votos || 0}
            votos

        </div>


        ${botonVoto}

    `;



    detalle.classList.remove(
        "oculto"
    );

}



// ======================================
// CERRAR DETALLE
// ======================================

function cerrarDetalleProyecto(){

    const detalle =
        document.getElementById(
            "detalle-proyecto"
        );


    if(detalle){

        detalle.classList.add(
            "oculto"
        );

    }

}



// ======================================
// MODAL VOTACIÓN
// ======================================

function abrirVotacion(idProyecto){

    const proyecto =
        proyectosUsuario.find(

            p =>
                p.id == idProyecto

        );


    if(!proyecto){

        console.error(
            "No se encontró el proyecto:",
            idProyecto
        );

        return;

    }



    const modal =
        document.getElementById(
            "modal-voto"
        );



    modal.innerHTML = `

        <div class="contenido-voto">


            <h2>

                🗳️ Votar proyecto

            </h2>


            <h3>

                ${proyecto.nombre}

            </h3>



            <div class="campo-rut">


                <label for="rut-votacion">

                    RUT

                </label>


                <input
                    type="text"
                    id="rut-votacion"
                    placeholder="12345678-9"
                >


            </div>



            <div class="botones-voto">


                <button
                    class="boton-confirmar"
                    onclick="confirmarVoto(${proyecto.id})"
                >

                    Confirmar voto

                </button>


                <button
                    class="boton-cancelar"
                    onclick="cerrarVotacion()"
                >

                    Cancelar

                </button>


            </div>


        </div>

    `;



    modal.classList.remove(
        "oculto"
    );

}



// ======================================
// CERRAR MODAL VOTACIÓN
// ======================================

function cerrarVotacion(){

    const modal =
        document.getElementById(
            "modal-voto"
        );


    if(modal){

        modal.classList.add(
            "oculto"
        );

    }

}



// ======================================
// CONFIRMAR VOTO
// ======================================

async function confirmarVoto(idProyecto){

    const campoRut =
        document.getElementById(
            "rut-votacion"
        );


    if(!campoRut){

        return;

    }



    const rut =
        campoRut.value.trim();



    // ======================================
    // VALIDAR RUT VACÍO
    // ======================================

    if(rut === ""){

        mostrarMensaje(

            "⚠️ Falta información",

            "Ingrese su RUT para continuar."

        );

        return;

    }



    // ======================================
    // VALIDAR FORMATO RUT
    // ======================================

    if(!validarRut(rut)){

        mostrarMensaje(

            "⚠️ RUT inválido",

            "Ingrese su RUT en formato 12345678-9."

        );

        return;

    }



    // ======================================
    // VERIFICAR SI YA VOTÓ
    // ======================================

    const yaVoto =
        await validarVoto(rut);



    if(yaVoto){

        mostrarMensaje(

            "ℹ️ Participación registrada",

            "Este RUT ya fue utilizado para votar."

        );

        return;

    }



    // ======================================
    // REGISTRAR VOTO
    // ======================================

    try{

        await registrarVoto({

            rut:rut,

            proyecto_id:idProyecto,

            nombre:usuarioActual.nombre,

            direccion:usuarioActual.direccion

        });



        // Guardar RUT del participante
        usuarioActual.rut = rut;



        // ======================================
        // ACTUALIZAR PROYECTOS
        // ======================================

        await cargarProyectos();



        const proyectoActualizado =
            proyectos.find(

                p =>
                    p.id == idProyecto

            );



        if(proyectoActualizado){

            mostrarDetalleProyecto(
                proyectoActualizado
            );

        }



        cerrarVotacion();



        mostrarMensaje(

            "✅ Gracias por participar",

            "Su voto fue registrado correctamente."

        );

    }


    catch(error){

        console.error(
            "Error registrando voto:",
            error
        );


        mostrarMensaje(

            "❌ Error",

            "No fue posible registrar el voto."

        );

    }

}



// ======================================
// VALIDAR RUT
// ======================================

function validarRut(rut){

    const formato =
        /^\d{7,8}-[\dkK]$/;


    return formato.test(rut);

}



// ======================================
// MODAL MENSAJES
// ======================================

function mostrarMensaje(
    titulo,
    mensaje
){

    const modal =
        document.getElementById(
            "modal-mensaje"
        );


    if(!modal){

        return;

    }



    modal.innerHTML = `

        <div class="contenido-mensaje">


            <h2>

                ${titulo}

            </h2>


            <p>

                ${mensaje}

            </p>


            <button
                onclick="cerrarMensaje()"
            >

                Aceptar

            </button>


        </div>

    `;



    modal.classList.remove(
        "oculto"
    );

}



// ======================================
// CERRAR MENSAJE
// ======================================

function cerrarMensaje(){

    const modal =
        document.getElementById(
            "modal-mensaje"
        );


    if(modal){

        modal.classList.add(
            "oculto"
        );

    }

}



// ======================================
// VERIFICAR PARTICIPACIÓN
// ======================================

async function verificarParticipacion(
    proyecto
){

    if(!usuarioActual.rut){

        return false;

    }



    const voto =
        await validarVoto(
            usuarioActual.rut
        );


    return voto;

}