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

async function registrarVoto(datos){


    const { data, error } =
        await window.supabaseClient
        .from("Votos")
        .insert([
            datos
        ]);


    if(error){

        console.error(
            "Error guardando voto:",
            error
        );

        throw error;

    }


    return data;

}




// ======================================
// VALIDAR SI RUT YA VOTÓ
// ======================================

async function validarVoto(rut){


    const { data, error } =
        await window.supabaseClient
        .from("Votos")
        .select("id")
        .eq("rut", rut);



    if(error){

        console.error(
            "Error validando voto:",
            error
        );

        return false;

    }


    return data.length > 0;


}