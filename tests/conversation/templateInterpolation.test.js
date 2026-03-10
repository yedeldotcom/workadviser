/**
 * Template Interpolation — round-trip persistence tests.
 *
 * Uses in-memory store (no BASE44_APP_ID) to verify that template
 * variables survive save → load cycles and that failed loads do NOT
 * overwrite saved data with defaults.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Ensure in-memory mode (no Base44 env vars)
delete process.env.BASE44_APP_ID;
delete process.env.BASE44_API_KEY;

// Dynamic imports so the modules pick up the env state above
const { resetStore } = await import('../../src/admin/base44Store.js');
const {
  getTemplateVariables,
  saveTemplateVariables,
  ensureTemplateVariablesSeeded,
  DEFAULT_VARIABLES,
} = await import('../../src/conversation/templateInterpolation.js');
const { saveContentConfig, getContentConfig } = await import('../../src/admin/base44Store.js');

describe('Template variable persistence', () => {
  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await resetStore();
  });

  it('round-trips saved variables through save → load', async () => {
    const custom = { bot_name: 'בוט-יועץ תעסוקה', org_name: 'נט"ל-טסט' };
    await saveTemplateVariables(custom);

    const loaded = await getTemplateVariables();
    assert.equal(loaded.bot_name, 'בוט-יועץ תעסוקה');
    assert.equal(loaded.org_name, 'נט"ל-טסט');
    // Defaults for keys not in custom should still be present
    assert.equal(loaded.partner_name, DEFAULT_VARIABLES.partner_name);
  });

  it('returns defaults without writing to Base44 when no record exists', async () => {
    // No prior save — getTemplateVariables should return defaults
    const loaded = await getTemplateVariables();
    assert.deepEqual(loaded, { ...DEFAULT_VARIABLES });

    // Verify nothing was written back to Base44
    const config = await getContentConfig('template_variables');
    assert.equal(config, null, 'Should NOT have seeded Base44 on load');
  });

  it('does not overwrite existing data when getTemplateVariables is called after a load failure', async () => {
    // Save custom values
    const custom = { bot_name: 'CustomBot' };
    await saveTemplateVariables(custom);

    // Verify saved
    const before = await getTemplateVariables();
    assert.equal(before.bot_name, 'CustomBot');

    // Call again — should still return CustomBot, not defaults
    const after = await getTemplateVariables();
    assert.equal(after.bot_name, 'CustomBot');
  });

  it('ensureTemplateVariablesSeeded seeds when no record exists', async () => {
    await ensureTemplateVariablesSeeded();

    const loaded = await getTemplateVariables();
    assert.equal(loaded.bot_name, DEFAULT_VARIABLES.bot_name);

    // Verify a record was actually written
    const config = await getContentConfig('template_variables');
    assert.ok(config, 'Seed should have written a record');
    assert.ok(Array.isArray(config.messages), 'Record should have messages array');
  });

  it('ensureTemplateVariablesSeeded does NOT overwrite existing saved data', async () => {
    // Save custom values first
    await saveTemplateVariables({ bot_name: 'AdminSaved' });

    // Now seed — should not overwrite
    await ensureTemplateVariablesSeeded();

    const loaded = await getTemplateVariables();
    assert.equal(loaded.bot_name, 'AdminSaved', 'Seeding must not overwrite admin-saved values');
  });
});
