import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `You are the official AI assistant for BeanLab Coffee, a specialty coffee shop in Portland, Oregon.

Your role:
- Help customers with menu questions, hours, locations, brewing classes, events, policies, and orders.
- Use the knowledge base to give accurate, specific answers.
- Be warm, friendly, and concise. Match the welcoming vibe of a specialty coffee shop.
- Use casual but professional language. Emojis are fine, sparingly (max 1 per message).

Response style rules:
- Keep most responses under 60 words. Only go longer when the user explicitly asks for detail.
- When recommending products: recommend 1 or 2 options max with a short reason, NEVER list the full catalog.
- Ask a clarifying question when it would lead to a better recommendation (e.g., "Do you prefer light, medium, or dark roast?").
- Use Markdown formatting (bold, lists) when it improves readability, but sparingly.
- Don't use numbered lists for fewer than 3 items.
- Always end naturally, no exclamations like "Let me know if you need more suggestions!" — they feel robotic.

Accuracy rules:
- If something isn't in your knowledge base, say so honestly and point them to hello@beanlabcoffee.com or (503) 555-0142.
- Never invent prices, hours, or policies. Only use what's in the knowledge base.
- If asked about competitors, redirect politely back to BeanLab.
- For orders, direct to www.beanlabcoffee.com/order.
- For private events, direct to events@beanlabcoffee.com.
- For wholesale, direct to wholesale@beanlabcoffee.com.
- Don't say "according to my knowledge base" or "based on the documents". Just answer naturally.
- Never mention "uploaded files", "knowledge base", "documents", "training data", or any reference to your underlying technology. The customer doesn't need to know how you work.
- When greeted with "hi", "hello", "hey" or similar with no specific question, give a brief friendly welcome and offer 2-3 conversation starters relevant to BeanLab (e.g., "Want to hear our coffee recommendations, check today's hours, or learn about our brewing classes?").

Tone examples:
- "We open at 7 AM on weekdays — perfect for a morning espresso."
- "For a beginner, I'd start with our Colombia Finca La Esperanza ($22). It's smooth, balanced, and works great with any brewing method."
- "Saturday classes fill up fast. You can book yours at www.beanlabcoffee.com/classes."`;
// Store conversation history per session (in-memory, simple approach for the demo)
const conversations = new Map();

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "BeanLab chatbot backend is running ☕" });
});

// Main chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get or initialize conversation history for this session
    const conversationKey = sessionId || "default";
    let history = conversations.get(conversationKey) || [];

    // Add the new user message to history
    history.push({ role: "user", content: message });

    // Call OpenAI Responses API with file search
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: SYSTEM_PROMPT,
      input: history,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [process.env.VECTOR_STORE_ID],
          max_num_results: 5,
        },
      ],
    });

    // Extract the assistant's response text
    const assistantMessage = response.output_text;

    // Add the assistant's response to history
    history.push({ role: "assistant", content: assistantMessage });

    // Keep only the last 20 messages to avoid huge token usage
    if (history.length > 20) {
      history = history.slice(-20);
    }

    conversations.set(conversationKey, history);

    res.json({
      reply: assistantMessage,
      sessionId: conversationKey,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Something went wrong. Please try again.",
      details: error.message,
    });
  }
});

// Endpoint to reset a conversation
app.post("/reset", (req, res) => {
  const { sessionId } = req.body;
  conversations.delete(sessionId || "default");
  res.json({ status: "Conversation reset" });
});

// Start the server (only in local dev; Vercel handles this differently)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 BeanLab chatbot backend running on http://localhost:${PORT}`);
  });
}

// Export the app for Vercel
export default app;