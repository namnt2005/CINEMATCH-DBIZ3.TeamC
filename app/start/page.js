import { getRouterData } from '../../lib/db/router.js';
import RouterForm from './router-form.js';

/**
 * SC-02 Segment router (/start), no sign-in (M1 FR-001, FR-002). The current decision table and the
 * requirement list are read on the server and handed to the page, which computes the result instantly
 * with the same function the API uses to store it (BR-001).
 */
export default async function StartPage() {
  const { rules, requirements } = await getRouterData();
  return <RouterForm rules={rules} requirements={requirements} />;
}
