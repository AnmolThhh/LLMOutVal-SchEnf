import express from 'express';
import db from '../db/db.js'; // 📥 Import the compiled db instance directly

export const getHistory = (req: express.Request, res: express.Response): void => {
  try {
    // 🔍 Query every single record from the log table, newest first
    const stmt = db.prepare('SELECT * FROM extraction_logs ORDER BY created_at DESC');
    const rawLogs = stmt.all(); // .all() pulls rows synchronously as an array of objects
    
    // 🧼 Cleanse and structure the columns back to true JSON objects for the client app
    const formattedLogs = rawLogs.map((log: any) => ({
      id: log.id,
      schemaName: log.schema_name,
      prompt: log.prompt,
      status: log.status,
      attempts: log.attempts,
      latencyMs: log.latency_ms,
      errorHistory: JSON.parse(log.error_history || '[]'), // Revert database text blob back to JSON array
      createdAt: log.created_at
    }));

    // Send uniform structured response
    res.status(200).json({
      success: true,
      count: formattedLogs.length,
      data: formattedLogs
    });

  } catch (error: any) {
    console.error("🚨 Ingestion Controller History Telemetry Exception:", error.message);
    res.status(500).json({
      success: false,
      error: "Unable to retrieve structural log history matrices from the persistence buffer."
    });
  }
};