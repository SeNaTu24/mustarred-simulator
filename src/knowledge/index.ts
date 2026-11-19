/**
 * Mustarred Company Simulator - Knowledge Base Module
 *
 * Public entrypoint exporting:
 * - Foundational domain types and certainty enums
 * - Company and departmental knowledge
 * - Character epistemic profiles
 * - IT phishing incident facts, timeline, evidence, and perspectives
 * - Regulatory reference catalog
 * - Immutable store and query selectors
 */

export * from './types.ts';
export * from './company.ts';
export * from './regulatory.ts';
export * from './characters.ts';
export * from './incidents/itPhishing.ts';
export * from './incidents/hrDispute.ts';
export * from './incidents/finDiesel.ts';
export * from './incidents/legalClient.ts';
export * from './candidateKnowledge.ts';
export * from './store.ts';
