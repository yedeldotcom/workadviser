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
 * @returns {Promise<Record<string, string>>}
 */
export async function getTemplateVariables() {
  try {
    const config = await getContentConfig('template_variables');
    if (config?.variables && typeof config.variables === 'object') {
      return { ...DEFAULT_VARIABLES, ...config.variables };
    }
    // No record found — seed defaults into Base44 so admin can edit them
    await saveContentConfig('template_variables', { variables: { ...DEFAULT_VARIABLES } });
  } catch {
    // Fall back to defaults
  }
  return { ...DEFAULT_VARIABLES };
}

/**
 * Save template variables to Base44.
 * @param {Record<string, string>} variables
 */
export async function saveTemplateVariables(variables) {
  await saveContentConfig('template_variables', { variables });
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
