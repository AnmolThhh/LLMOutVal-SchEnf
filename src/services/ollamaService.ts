// src/ollamaService.ts
import ollama from 'ollama';
import { generateDynamicSchema, type SchemaBlueprint } from './dynamicCompiler.js';
import { generateExtractionPrompt } from './promptEngine.js';
import { saveLogToDb } from '../db/db.js';

export class ExtractionService {
  private model = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";
  private maxRetries = 3;

  async extract(schemaName: string, text: string, blueprint: SchemaBlueprint) {
    const startTime = Date.now();
    const zodSchema = generateDynamicSchema(blueprint);
    const history: any[] = []; 

    try {
      const validatedData = await this.executeLoop(text, blueprint, zodSchema, 0, history);
      const latencyMs = Date.now() - startTime;

      saveLogToDb({
        schemaName,
        prompt: text,
        status: 'Success',
        attempts: history.length,
        latencyMs,
        errorHistory: history
      });
      
      return {
        success: true,
        data: validatedData,
        metadata: { attempts: history.length, latencyMs }
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;

      saveLogToDb({
        schemaName,
        prompt: text,
        status: 'Failure',
        attempts: history.length,
        latencyMs,
        errorHistory: history
      });

      return {
        success: false,
        error: "Failed after 3 attempts.",
        errorHistory: history 
      };
    }
  }

  private async executeLoop(text: string, blueprint: SchemaBlueprint, zodSchema: any, currentRetry: number, history: any[], lastError?: string): Promise<any> {
    // ⚡ pure deterministic JSON instruction path
    const prompt = generateExtractionPrompt(text, blueprint, lastError);

    try {
      const response = await ollama.generate({ model: this.model, prompt: prompt, options: { temperature: 0.1 } });
      const cleanJson = this.extractJsonString(response.response);
      const parsed = JSON.parse(cleanJson);
      const validation = zodSchema.safeParse(parsed);

      if (validation.success) {
        history.push({ attempt: currentRetry + 1, status: "Success" });
        return validation.data;
      }

      const errorMsg = validation.error.errors.map((e: any) => e.message).join('; ');
      history.push({ attempt: currentRetry + 1, error: errorMsg });

      if (currentRetry < this.maxRetries - 1) {
        return this.executeLoop(text, blueprint, zodSchema, currentRetry + 1, history, errorMsg);
      }
      throw new Error(errorMsg);

    } catch (e: any) {
      const syntaxCrashText = e instanceof SyntaxError ? "Invalid JSON structure context." : e.message;
      
      if (!history.some(h => h.attempt === currentRetry + 1)) {
        history.push({ attempt: currentRetry + 1, error: syntaxCrashText });
      }

      if (currentRetry < this.maxRetries - 1) {
        return this.executeLoop(text, blueprint, zodSchema, currentRetry + 1, history, syntaxCrashText);
      }
      throw e;
    }
  }

  private extractJsonString(raw: string): string {
    return raw.replace(/```json|```/g, "").trim(); 
  }
}