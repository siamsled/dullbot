import { supabaseAdmin } from "@/lib/supabase-admin";
import { saveAiTuning } from "@/app/dashboard/ai-tuning/actions";

async function testSaveAiTuning() {
    console.log("Fetching shop and persona IDs...");

    // Get shop ID for 'Dull Store'
    const { data: shopData, error: shopError } = await supabaseAdmin
        .from("shops")
        .select("id, name, persona_id, persona_custom_name, disclosure_mode, max_discount_pct, auto_escalate_on_complaint, confidence_fallback, ai_instructions, allow_discounts, escalation_severity, handle_audio, abusive_handling_mode, abusive_block_threshold, high_value_order_threshold, off_topic_tolerance, deposit_refund_policy")
        .eq("name", "Dull Store")
        .single();

    if (shopError || !shopData) {
        console.error("Error fetching shop:", shopError?.message);
        return;
    }

    const shopId = shopData.id;
    const currentPersonaId = shopData.persona_id;
    console.log(`Current Persona ID for Dull Store: ${currentPersonaId}`);

    // Get two different persona IDs
    const { data: personas, error: personasError } = await supabaseAdmin
        .from("agent_personas")
        .select("id, name")
        .limit(2);

    if (personasError || !personas || personas.length < 2) {
        console.error("Error fetching personas or not enough personas:", personasError?.message);
        return;
    }

    const newPersonaId = personas.find(p => p.id !== currentPersonaId)?.id || personas[0].id;
    console.log(`Attempting to change persona to ID: ${newPersonaId} (Name: ${personas.find(p => p.id === newPersonaId)?.name})");

  // Construct payload with existing settings but new persona_id
  const payload = {
    ...shopData,
    persona_id: newPersonaId,
  };

  // Remove id and name from payload as they are not part of the update payload for saveAiTuning
  delete (payload as any).id;
  delete (payload as any).name;

  console.log("Calling saveAiTuning directly...");
  const saveResult = await saveAiTuning(payload);

  if (saveResult.success) {
    console.log("saveAiTuning call successful. Verifying update...");
    const { data: updatedShopData, error: updatedShopError } = await supabaseAdmin
      .from("shops")
      .select("persona_id, persona_updated_at")
      .eq("id", shopId)
      .single();

    if (updatedShopError || !updatedShopData) {
      console.error("Error fetching updated shop details:", updatedShopError?.message);
      return;
    }

    console.log(`Updated Persona ID: ${ updatedShopData.persona_id }`);
    console.log(`Updated Persona Updated At: ${ updatedShopData.persona_updated_at }`);

    if (updatedShopData.persona_id === newPersonaId) {
      console.log("Persona ID updated successfully in the database.");
      // Additional check: persona_updated_at should be recent
      const updatedTimestamp = new Date(updatedShopData.persona_updated_at);
      const now = new Date();
      const diffSeconds = Math.abs((now.getTime() - updatedTimestamp.getTime()) / 1000);

      if (diffSeconds < 60) { // Within 60 seconds
        console.log("persona_updated_at is recent. Backend update seems to be working.");
      } else {
        console.warn("persona_updated_at is not recent. There might be a time sync issue or a delayed update.");
      }
      console.log("Backend update *appears* to be working correctly. The issue is likely in the frontend.");
    } else {
      console.error("Persona ID did NOT update correctly in the database. Investigating RLS or silent failures.");
      console.log("The bug is in the backend: the `saveAiTuning` function is not persisting the persona change.");
    }
  } else {
    console.error("saveAiTuning call failed:", saveResult.error);
    console.log("The bug is in the backend: the `saveAiTuning` function is not persisting the persona change (due to a reported error).");
  }
}

testSaveAiTuning();
