/**
 * Template Interpolation — FPP §7
 *
 * Simple {{variable}} substitution for onboarding messages and other
 * admin-editable text. Variables are stored in Base44 ContentConfig
 * and can be edited from the admin Content Editor.
 */

import { getContentConfig, saveContentConfig } from '../admin/base44Store.js';

// ─── Default template variables ──────────────────────────────────────────────

const DEFAULT_VARIABLES = {
  bot_name: 'WorkAdviser',
  org_name: 'נט"ל',
  partner_name: 'ירון אדל',
  project_description: 'פרויקט של נט"ל וירון אדל שמלווה אנשים עם טראומה להצליח בעבודה',
};

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Replace {{key}} placeholders in text with values from the variables map.
 * Unknown placeholders are left as-is.
 *
 * @param {string} text - Template text with {{variable}} placeholders
 * @param {Record<string, string>} variables - Key-value map of variable names to values
 * @returns {string}
 */
export function interpolateTemplate(text, variables) {
  if (!text || !variables) return text ?? '';
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}

/**
 * Fetch template variables from Base44, falling back to hardcoded defaults.
 *
 * Storage: variables are encoded as a `messages` array of {key, value} objects
 * inside ContentConfig.  The `messages` field is proven to persist in Base44;
 * custom fields like `variables` and `data` may be silently dropped.
 *
 * @returns {Promise<Record<string, string>>}
 */
export async function getTemplateVariables() {
  try {
    const config = await getContentConfig('template_variables');
    // Primary path: decode from messages array
    if (Array.isArray(config?.messages) && config.messages.length > 0) {
      const variables = {};
      for (const item of config.messages) {
        if (item?.key && item.value !== undefined) variables[item.key] = item.value;
      }
      if (Object.keys(variables).length > 0) {
        return { ...DEFAULT_VARIABLES, ...variables };
      }
    }
    // Legacy path: variables stored directly (may work if Base44 schema was updated)
    if (config?.variables && typeof config.variables === 'object') {
      return { ...DEFAULT_VARIABLES, ...config.variables };
    }
    // No usable record — seed defaults so admin can see them in Content Editor
    await _saveVariablesAsMessages(DEFAULT_VARIABLES);
  } catch (err) {
    console.error('[templateInterpolation] getTemplateVariables failed:', err?.message ?? err);
  }
  return { ...DEFAULT_VARIABLES };
}

/**
 * Save template variables to Base44 (encoded as messages array).
 * @param {Record<string, string>} variables
 */
export async function saveTemplateVariables(variables) {
  await _saveVariablesAsMessages(variables);
}

/**
 * Internal: encode variables as messages array for Base44 persistence.
 * Uses the `messages` field which is proven to persist on ContentConfig.
 */
async function _saveVariablesAsMessages(variables) {
  const messages = Object.entries(variables).map(([key, value]) => ({ key, value }));
  await saveContentConfig('template_variables', { messages, version: 1 });
}

/**
 * Returns the list of available variable names with their current values and descriptions.
 * Used by the admin Content Editor to show available placeholders.
 * @returns {Promise<Array<{ key: string, value: string, description: string }>>}
 */
export async function getTemplateVariablesList() {
  const variables = await getTemplateVariables();
  const descriptions = {
    bot_name: 'שם הבוט',
    org_name: 'שם הארגון',
    partner_name: 'שם השותף/ה',
    project_description: 'תיאור הפרויקט',
  };
  return Object.entries(variables).map(([key, value]) => ({
    key,
    value,
    description: descriptions[key] ?? key,
  }));
}

export { DEFAULT_VARIABLES };
