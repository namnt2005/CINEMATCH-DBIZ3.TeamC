import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne } from '../../lib/db/client.js';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// The buffer before shooting is editable (T055, decision D10, M0 question 2; SC-29 #4): 0, 7, 14 or 21 days, by the owner
// and edit members, never on an archived project. Every existing M0 test stays as it is.
const input = () => import('../../lib/projects/input.js');
const projects = () => import('../../lib/db/projects.js');
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');      // owner of The Last Ferry
const JIWOO = member('b9916111-9b75-5ab9-b88c-4d578a87cd46');     // edit member of The Last Ferry
const OKAFOR = member('2985398f-7372-5d92-a85d-117c3a4b91e4');    // view member of Rice and Salt
const LAURENT = member('95f36904-6141-5469-8c63-712a80a4295e');   // owner of Harbour Lights (archived)
const FERRY = 'd74c8638-b266-5ed1-bc2c-ca130a0463da';
const RICE = 'acbcadc9-e8ae-5507-b207-6322f59faf0e';
const HARBOUR_LIGHTS = 'a745bb54-573f-5e8f-9d99-2d7e9af46ccf';
const buffer = (id) => Number(getOne('SELECT buffer_days FROM project WHERE project_id = ?', [id]).buffer_days);

describe('Editable buffer (T055)', () => {
  test('D10: validateProjectUpdate accepts 0, 7, 14, 21 and refuses anything else with projects.error.buffer_days', async () => {
    const { validateProjectUpdate } = await input();
    for (const v of [0, 7, 14, 21]) {
      const r = validateProjectUpdate({ buffer_days: v });
      assert.equal(r.ok, true, String(v));
      assert.equal(r.value.buffer_days, v);
    }
    for (const v of [3, -7, 28, '14', null, 7.5]) assert.equal(validateProjectUpdate({ buffer_days: v }).errors.buffer_days, 'projects.error.buffer_days', String(v));
    assert.equal(typeof vi['projects.error.buffer_days'], 'string');
    assert.equal(typeof en['projects.error.buffer_days'], 'string');
  });

  test('D10: the owner and an edit member change the buffer', async () => {
    const { updateProject } = await projects();
    await updateProject(PARK, FERRY, { buffer_days: 14 });
    assert.equal(buffer(FERRY), 14);
    await updateProject(JIWOO, FERRY, { buffer_days: 7 });
    assert.equal(buffer(FERRY), 7);
  });

  test('a view member cannot; an archived project cannot change', async () => {
    const { updateProject } = await projects();
    await assert.rejects(async () => updateProject(OKAFOR, RICE, { buffer_days: 21 }), (e) => e.code === 'FORBIDDEN');
    await assert.rejects(async () => updateProject(LAURENT, HARBOUR_LIGHTS, { buffer_days: 21 }), (e) => e.code === 'ARCHIVED');
    assert.equal(buffer(RICE), 14);
  });
});
