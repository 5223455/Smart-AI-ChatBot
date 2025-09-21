const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    try {
        const response = await genAI.listModels();
        const models = response.models.map((m) => m.name);
        console.log("Available models:", models);
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
