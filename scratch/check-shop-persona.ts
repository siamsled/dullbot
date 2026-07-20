import { supabaseAdmin } from "./src/lib/supabase-admin.ts";

async function checkShopPersona() {
    console.log("Fetching shop persona details...");
    const { data: shop, error } = await supabaseAdmin
        .from("shops")
        .select("id, name, persona_id, persona_updated_at")
        .eq("name", "Dull Store")
        .single();

    if (error) {
        console.error("Error fetching shop:", error);
        return;
    }

    if (shop) {
        console.log("Shop Found:");
        console.log(`  ID: ${shop.id}`);
        console.log(`  Name: ${shop.name}`);
        console.log(`  Persona ID: ${shop.persona_id}`);
        console.log(`  Persona Updated At: ${shop.persona_updated_at}`);
    } else {
        console.log("Shop 'Dull Store' not found.");
    }
}

checkShopPersona();
