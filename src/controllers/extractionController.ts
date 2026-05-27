import express from 'express';
import {ExtractionService} from '../services/ollamaService.js';

const service = new ExtractionService();

// src/extractionController.ts

export async function handleExtraction(req: express.Request, res: express.Response): Promise<any> {
  try {
    const { unstructuredText, schemaBlueprint } = req.body;

    if (!unstructuredText || !schemaBlueprint) {
      return res.status(400).json({
        success: false,
        error: "Missing parameters."
      });
    }

    console.log("Received extraction request");
    const structuredResult = await service.extract(unstructuredText, schemaBlueprint);

    return res.status(200).json({
      success: true,
      data: structuredResult
    });

  } catch (error: any) {
    console.error("Ingestion Pipeline Controlled Stop:", error.message);
    
    if (error.message.includes("Max retries reached")) {
      return res.status(422).json({
        success: false,
        error: "The AI engine was unable to conform to the requested schema specifications within retry limits.",
        details: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
}