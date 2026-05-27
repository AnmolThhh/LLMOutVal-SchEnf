import express from 'express';
import dotenv from 'dotenv';
import {handleExtraction} from './controllers/extractionController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL_NAME = process.env.OLLAMA_MODEL || "default-model";

app.use(express.json());

app.post("/api/v1/extract", handleExtraction);

app.get("/health", (req: express.Request, res: express.Response) => {
    res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

app.listen(PORT,() => {
    console.log(`Server is running on port : ${PORT}`);
    console.log(`Ollama Model : ${MODEL_NAME}`);
})