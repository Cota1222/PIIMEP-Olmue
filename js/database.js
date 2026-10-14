/*
========================================================

PIIMEP Participa

Archivo:
database.js

Descripción:
Conexión con Supabase para almacenar votos.

========================================================
*/


// ======================================
// CONFIGURACIÓN SUPABASE
// ======================================

const SUPABASE_URL = "https://xukxdskecqytgufgersi.supabase.co";

const SUPABASE_KEY = "sb_publishable_AnmoCr1JL_rxDVE0KfgOdw_vw58nugF";


window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);



// ======================================
// REGISTRAR VOTO
// ======================================


async function registrarVoto(datos) {
    const respuesta = await fetch(
        `${SUPABASE_URL}/functions/v1/registrar-voto`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                accion: "registrar",
                ...datos
            })
        }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        const error = new Error(
            resultado.error || "No fue posible registrar el voto."
        );

        error.codigo = resultado.codigo;
        error.status = respuesta.status;

        throw error;
    }

    return resultado;
}


async function obtenerConteosVotos() {
    const respuesta = await fetch(
        `${SUPABASE_URL}/functions/v1/registrar-voto`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                accion: "conteos"
            })
        }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            resultado.error || "No fue posible obtener los conteos."
        );
    }

    return resultado.conteos || {};
}


// ======================================
// OBTENER PROYECTOS PIIMEP
// ======================================

async function obtenerProyectos(){

    const { data, error } =
        await window.supabaseClient
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
            "Error obteniendo proyectos:",
            error
        );

        throw error;

    }

    return data;

}