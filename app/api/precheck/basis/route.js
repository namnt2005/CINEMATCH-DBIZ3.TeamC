import { precheckBasis } from '../../../../lib/db/precheck.js';

/** GET /api/precheck/basis — SC-03 #10: the rule set in force, its number of approved rules, and whether advanced analysis exists (D12). */
export async function GET() {
  return Response.json(await precheckBasis());
}
