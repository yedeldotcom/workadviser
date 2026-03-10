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
 * Storage: variables are encoded as a single message in the `messages` array
 * with the same {id, step, type, text} structure used by onboarding messages
 * (which is proven to persist in Base44).  The variables object is JSON-serialized
 * inside the `text` field.
 *
 * @returns {Promise<Record<string, string>>}
 */
export async function getTemplateVariables() {
  try {
    const config = await getContentConfig('template_variables');
    // Primary path: decode from messages[0].text (JSON-encoded variables)
    if (Array.isArray(config?.messages) && config.messages.length > 0) {
      const msg = config.messages[0];
      if (msg?.text) {
        try {
          const parsed = JSON.parse(msg.text);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_VARIABLES, ...parsed };
          }
        } catch { /* text isn't JSON — try key/value fallback */ }
      }
      // Fallback: earlier {key, value} encoding attempt
      const variables = {};
      for (const item of config.messages) {
        if (item?.key && item.value !== undefined) variables[item.key] = item.value;
      }
      if (Object.keys(variables).length > 0) {
        return { ...DEFAULT_VARIABLES, ...variables };
      }
    }
    // Legacy path: variables stored directly (if Base44 schema was updated)
    if (config?.variables && typeof config.variables === 'object') {
      return { ...DEFAULT_VARIABLES, ...config.variables };
    }
    // No usable record — seed defaults so admin can see them in Content Editor
    await _saveVariablesAsMessage(DEFAULT_VARIABLES);
  } catch (err) {
    console.error('[templateInterpolation] getTemplateVariables failed:', err?.message ?? err);
  }
  return { ...DEFAULT_VARIABLES };
}

/**
 * Save template variables to Base44 (encoded inside a message's text field).
 * @param {Record<string, string>} variables
 */
export async function saveTemplateVariables(variables) {
  await _saveVariablesAsMessage(variables);
}

/**
 * Internal: encode variables using the same message structure ({id, step, type, text})
 * that onboarding messages use — proven to persist in Base44 ContentConfig.
 * The variables object is JSON-serialized in the text field.
 */
async function _saveVariablesAsMessage(variables) {
  const messages = [{
    id: 'template-vars',
    step: 0,
    type: 'variables',
    text: JSON.stringify(variables),
  }];
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
