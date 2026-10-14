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
// FORMATEAR NOMBRE DEL PROYECTO
// ======================================

function formatearNombreProyecto(nombre){

    if(!nombre){

        return "Proyecto sin nombre";

    }

    return nombre
        .toLowerCase()
        .replace(/\b\w/g, letra => letra.toUpperCase());

}

function cerrarDetalleProyecto(){

    const detalle =
        document.getElementById("detalle-proyecto");

    if(!detalle){
        return;
    }

    detalle.style.display = "none";

}

// ======================================
// MOSTRAR / OCULTAR LEYENDA
// ======================================

function toggleLeyenda(){

    const leyenda =
        document.getElementById(
            "contenido-leyenda"
        );


    if(!leyenda){

        return;

    }


    if(leyenda.style.display === "block"){

        leyenda.style.display = "none";

    }
    else{

        leyenda.style.display = "block";

    }

}
// ======================================
// MOSTRAR DETALLE PROYECTO
// ======================================

async function mostrarDetalleProyecto(proyecto){

    const detalle =
        document.getElementById("detalle-proyecto");

    if(!detalle){
        return;
    }

    detalle.style.display = "block";


    // ======================================
    // COLOR SEGÚN CATEGORÍA
    // ======================================

    let colorCategoria =
        "#666666";


    if(
        proyecto.categoria ===
        "Movilidad"
    ){

        colorCategoria =
            "#F2C300";

    }


    if(
        proyecto.categoria ===
        "Espacio Público"
    ){

        colorCategoria =
            "#2E7D32";

    }


    // ======================================
    // CÓDIGO DEL PROYECTO
    // ======================================

    const codigo =
        proyecto.codigo ||
        `PIIMEP-${String(proyecto.id).padStart(3,"0")}`;


    // ======================================
    // BOTÓN DE VOTACIÓN
    // ======================================

    let botonVoto = `

        <button
            class="boton-votar"
            onclick="abrirVotacion(${proyecto.id})"
            style="
                background-color:${colorCategoria};
            "
        >

            🗳️ Votar por este proyecto

        </button>

    `;


    // ======================================
    // VERIFICAR SI EL USUARIO YA VOTÓ
    // ======================================

    


if (usuarioActual.rut) {
    botonVoto = `
        <button
            class="boton-votar votado"
            disabled
            style="background-color:${colorCategoria};"
        >
            ✓ Participación registrada
        </button>
    `;
}




    // ======================================
    // MOSTRAR INFORMACIÓN
    // ======================================

    detalle.innerHTML = `

        <!-- ==================================
             BOTÓN CERRAR
        ================================== -->

        <button
            class="cerrar-detalle"
            onclick="cerrarDetalleProyecto()"
            aria-label="Cerrar información"
        >

            ✕

        </button>


        <!-- ==================================
             CÓDIGO
        ================================== -->

        <div
            class="detalle-codigo"
            style="
                color:${colorCategoria};
            "
        >

            ${codigo}

        </div>


        <!-- ==================================
             NOMBRE
        ================================== -->

        <h2>

            ${formatearNombreProyecto(proyecto.nombre)}

        </h2>


        <!-- ==================================
             CATEGORÍA PRINCIPAL
        ================================== -->

        <div class="detalle-categoria">

            <span
                class="detalle-indicador-categoria"
                style="
                    background-color:${colorCategoria};
                "
            ></span>

            <span>

                ${proyecto.categoria || "Proyecto"}

            </span>

        </div>


        <!-- ==================================
             DATOS DEL PROYECTO
        ================================== -->

        <div class="detalle-datos">


            <!-- CATEGORÍA -->

            <div class="detalle-dato">

                <span class="detalle-label">

                    Categoría

                </span>

                <strong>

                    ${proyecto.subcategoria || ""}

                </strong>

            </div>


            <!-- ESTADO -->

            <div class="detalle-dato">

                <span class="detalle-label">

                    Estado

                </span>

                <strong>

                    ${proyecto.estado || ""}

                </strong>

            </div>


        </div>


        <!-- ==================================
             DESCRIPCIÓN
        ================================== -->

        <div class="detalle-descripcion">

            <span class="detalle-label">

                Descripción

            </span>

            <p>

                ${proyecto.descripcion || ""}

            </p>

        </div>


        <!-- ==================================
             PARTICIPACIÓN
        ================================== -->

        <div class="detalle-votos">

            <span>

                Participación

            </span>

            <strong>

                ${proyecto.votos || 0}

                ${
                    (proyecto.votos || 0) === 1
                    ? " voto"
                    : " votos"
                }

            </strong>

        </div>


        <!-- ==================================
             BOTÓN VOTAR
        ================================== -->

        ${botonVoto}


    `;


    detalle.classList.remove(
        "oculto"
    );

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
    // REGISTRAR VOTO
    // ======================================

    try{

        await registrarVoto({

            rut:
                rut,

            proyecto_id:
                idProyecto,

            nombre:
                usuarioActual.nombre,

            direccion:
                usuarioActual.direccion

        });


        // ==================================
        // GUARDAR RUT DEL PARTICIPANTE
        // ==================================

        usuarioActual.rut =
            rut;


        // ==================================
        // ACTUALIZAR PROYECTOS
        // ==================================

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


        // ==================================
        // MENSAJE DE ÉXITO
        // ==================================

        mostrarMensaje(

            "✅ Gracias por participar",

            "Su voto fue registrado correctamente."

        );

    }


    
catch(error) {
    console.error("Error registrando voto:", error);

    if (
        error.codigo === "RUT_YA_VOTO" ||
        error.status === 409
    ) {
        mostrarMensaje(
            "⚠️ Ya participaste",
            "Este RUT ya fue utilizado para votar."
        );
        return;
    }

    mostrarMensaje(
        "❌ Error",
        error.message || "No fue posible registrar el voto."
    );
}


}



// ======================================
// VALIDAR RUT
// ======================================


function validarRut(rut) {

    const rutNormalizado = rut
        .replace(/\./g, "")
        .replace(/\s/g, "")
        .toUpperCase();

    const formato = /^(\d{7,8})-([\dK])$/;
    const coincidencia = rutNormalizado.match(formato);

    if (!coincidencia) {
        return false;
    }

    const numero = coincidencia[1];
    const digitoIngresado = coincidencia[2];

    let suma = 0;
    let multiplicador = 2;

    for (let i = numero.length - 1; i >= 0; i--) {
        suma += Number(numero[i]) * multiplicador;

        multiplicador =
            multiplicador === 7
                ? 2
                : multiplicador + 1;
    }

    const resultado = 11 - (suma % 11);

    const digitoEsperado =
        resultado === 11
            ? "0"
            : resultado === 10
                ? "K"
                : String(resultado);

    return digitoIngresado === digitoEsperado;
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
