import ollama from 'ollama';
import { generateDynamicSchema, type SchemaBlueprint } from './dynamicCompiler.js';
import { generateExtractionPrompt } from './promptEngine.js';

export class ExtractionService {
  private model = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";
  private maxRetries = 3;

  async extract(text: string, blueprint: SchemaBlueprint, strategy: 'json_instruction' | 'few_shot' = 'json_instruction') {
    const startTime = Date.now();
    const zodSchema = generateDynamicSchema(blueprint);
    const history: any[] = []; // This stores every attempt's result

    try {
      const validatedData = await this.executeLoop(text, blueprint, zodSchema, 0, strategy, history);
      
      // Success response with simple metrics
      return {
        success: true,
        data: validatedData,
        metadata: {
          attempts: history.length,
          latencyMs: Date.now() - startTime
        }
      };
    } catch (error: any) {
      // Failure response showing the "why"
      return {
        success: false,
        error: "Failed after 3 attempts.",
        errorHistory: history 
      };
    }
  }

  private async executeLoop(text: string, blueprint: SchemaBlueprint, zodSchema: any, currentRetry: number, strategy: string, history: any[], lastError?: string): Promise<any> {
    let prompt = generateExtractionPrompt(text, blueprint, lastError);

    // Simple "Few-Shot" logic: give it a tiny example if requested
    if (strategy === 'few_shot') {
      prompt += `\nExample format: {"key": "value"}`;
    }

    try {
      const response = await ollama.generate({ model: this.model, prompt: prompt, options: { temperature: 0.1 } });
      const cleanJson = this.extractJsonString(response.response);
      const parsed = JSON.parse(cleanJson);
      const validation = zodSchema.safeParse(parsed);

      if (validation.success) {
        history.push({ attempt: currentRetry + 1, status: "Success" });
        return validation.data;
      }

      // Record the error and retry
      const errorMsg = validation.error.errors.map((e: any) => e.message).join('; ');
      history.push({ attempt: currentRetry + 1, error: errorMsg });

      if (currentRetry < this.maxRetries - 1) {
        return this.executeLoop(text, blueprint, zodSchema, currentRetry + 1, strategy, history, errorMsg);
      }
      throw new Error(errorMsg);

    } catch (e: any) {
      if (currentRetry < this.maxRetries - 1) {
        return this.executeLoop(text, blueprint, zodSchema, currentRetry + 1, strategy, history, "Invalid JSON structure.");
      }
      throw e;
    }
  }

  private extractJsonString(raw: string): string {
    return raw.replace(/```json|```/g, "").trim(); // Simple regex to clean markdown
  }
}