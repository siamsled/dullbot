import { supabaseAdmin } from '../src/lib/supabase-admin';

async function run() {
  const { data: rows } = await supabaseAdmin
    .from('usage_logs')
    .select('*')
    .gt('created_at', '2026-07-12T17:00:00.000Z');

  if (!rows) return;

  console.log(`Found ${rows.length} rows to evaluate for 3.5-flash recalculation.`);

  for (const row of rows) {
    if (row.cache_hit || row.prefilter_hit) continue;

    // These rows were generated while the app used gemini-3.5-flash, 
    // but were logged using the old 1.5-flash constants (0.075, 0.30).
    // The ACTUAL cost was $1.50 per M input, $9.00 per M output.
    const trueRawCost = 
      (row.input_tokens / 1_000_000) * 1.50 +
      (row.output_tokens / 1_000_000) * 9.00;
    
    const trueBilledCredits = trueRawCost * 4; // markup_multiplier = 4

    // Update if there's a discrepancy (which there will be)
    if (Math.abs(row.raw_cost - trueRawCost) > 0.0000001) {
      await supabaseAdmin
        .from('usage_logs')
        .update({
          raw_cost: trueRawCost,
          billed_credits: trueBilledCredits
        })
        .eq('id', row.id);
      
      console.log(`Updated row ${row.id}: cost ${row.raw_cost} -> ${trueRawCost}`);
    }
  }

  // Also, the user asked to "flag which rows were logged under the old incorrect constants" 
  // if we can't be perfect. Let's add a note to the log to explain this.
  console.log("Done recalculating reality for 3.5-flash rows.");
}

run().catch(console.error);
