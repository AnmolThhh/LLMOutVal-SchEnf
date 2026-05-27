import type { SchemaBlueprint } from './services/dynamicCompiler.js';

/**
 * Generates a hyper-specific markdown prompt for the local LLM.
 * * @param text The raw natural language input string.
 * @param blueprint The schema configuration defining our expected keys.
 * @param validationError Optional feedback from Zod if a previous attempt failed.
 */
export function generateExtractionPrompt(
  text: string, 
  blueprint: SchemaBlueprint, 
  validationError?: string
): string {
  
  // 1. Convert the blueprint object into a human-readable markdown list for the AI
  const schemaInstructions = Object.entries(blueprint)
    .map(([key, config]) => `- "${key}" (${config.type}): ${config.description}`)
    .join('\n');

  // 2. Build the primary base prompt
  let prompt = `You are a high-precision data extraction microservice. 
Your single objective is to extract unstructured text into a perfectly valid JSON object conforming strictly to the schema specification detailed below.

### EXPECTED SCHEMA DEFINITION:
${schemaInstructions}

### ABSOLUTE RULES:
1. Return ONLY raw, valid JSON. Do not write introductory chatter, explanations, markdown code blocks (like \`\`\`json), or notes.
2. Ensure every single key mentioned in the schema definition exists in your final output.
3. Match data types precisely: strings must be quotes, numbers must be bare digits, booleans must be true/false.

### SOURCE RAW TEXT:
"${text}"

`;

  // 3. Inject Self-Correction Feedback (if a previous run broke validation)
  if (validationError) {
    prompt += `⚠️ CRITICAL SYSTEM ALERT: 
Your previous extraction attempt failed runtime structural validation with the following schema violation:
--> "${validationError}"

Please analyze this error, adjust your types or values to comply, and output the complete corrected JSON now.`;
  }

  prompt += `\n### FINAL JSON RESPONSE:`;
  return prompt;
}