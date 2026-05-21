import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function setupVectorStore() {
  console.log("📦 Creando Vector Store para BeanLab Coffee...");

  // 1. Crear el Vector Store
  const vectorStore = await client.vectorStores.create({
    name: "BeanLab Coffee Knowledge Base",
  });

  console.log(`✅ Vector Store creado con ID: ${vectorStore.id}`);
  console.log(`👉 GUARDA ESTE ID, lo necesitarás después.\n`);

  // 2. Subir los archivos de la carpeta knowledge
  const knowledgeDir = path.join(__dirname, "..", "knowledge");
  const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith(".txt"));

  console.log(`📁 Encontrados ${files.length} archivos para subir...\n`);

  const fileStreams = files.map(filename => {
    const filePath = path.join(knowledgeDir, filename);
    console.log(`   📄 Preparando ${filename}`);
    return fs.createReadStream(filePath);
  });

  // 3. Subir todos los archivos al Vector Store (esto los procesa automáticamente)
  console.log("\n⏳ Subiendo y procesando archivos (puede tardar 30-60s)...");

  await client.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, {
    files: fileStreams,
  });

  console.log("✅ Todos los archivos subidos y procesados correctamente!\n");
  console.log("══════════════════════════════════════════════════════");
  console.log(`VECTOR_STORE_ID = ${vectorStore.id}`);
  console.log("══════════════════════════════════════════════════════");
  console.log("\n👉 Copia ese ID y agrégalo a tu archivo .env así:");
  console.log(`VECTOR_STORE_ID=${vectorStore.id}`);
}

setupVectorStore().catch(error => {
  console.error("❌ Error:", error);
  process.exit(1);
});