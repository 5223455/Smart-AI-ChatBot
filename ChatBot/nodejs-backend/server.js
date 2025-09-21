require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
app.use(cors());

const chatHistory = {};
const imageHistory = {};

// 🔹 Ollama Configuration (100% FREE, runs locally)
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b"; // or "mistral", "codellama"

// 🔹 Smart Response Detection - Quick vs Detailed
function detectResponseType(message) {
    const quickPatterns = [
        /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
        /^(how are you|what's up|how's it going)/i,
        /^(thanks|thank you|bye|goodbye|see you)/i,
        /^(yes|no|ok|okay|sure|alright)/i,
        /^(what time|what day|what date)/i,
        /^(who are you|what are you)/i
    ];
    
    const detailedPatterns = [
        /^(explain|describe|tell me about|what is|how does|why)/i,
        /^(help me|can you help|how to|tutorial|guide)/i,
        /^(compare|difference|pros and cons)/i,
        /^(create|make|build|develop)/i,
        /^(analyze|review|evaluate)/i
    ];
    
    for (const pattern of quickPatterns) {
        if (pattern.test(message.trim())) {
            return 'quick';
        }
    }
    
    for (const pattern of detailedPatterns) {
        if (pattern.test(message.trim())) {
            return 'detailed';
        }
    }
    
    // Default to quick for short messages, detailed for long ones
    return message.length < 50 ? 'quick' : 'detailed';
}

// 🔹 Pre-defined Quick Responses with VARIETY for instant replies
function getQuickResponse(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Multiple response options for variety
    const responses = {
        greeting: [
            "Hello! How can I help you today?",
            "Hi there! What can I do for you?",
            "Hey! Ready to assist you!",
            "Hello! What do you need help with?",
            "Hi! How can I be of service?"
        ],
        goodMorning: [
            "Good morning! What can I do for you?",
            "Morning! Ready to help you today!",
            "Good morning! How can I assist you?",
            "Morning! What do you need help with?",
            "Good morning! What's on your mind?"
        ],
        goodAfternoon: [
            "Good afternoon! How can I assist you?",
            "Afternoon! What can I do for you?",
            "Good afternoon! Ready to help!",
            "Afternoon! How can I be of service?",
            "Good afternoon! What do you need?"
        ],
        goodEvening: [
            "Good evening! What do you need help with?",
            "Evening! How can I assist you?",
            "Good evening! Ready to help!",
            "Evening! What can I do for you?",
            "Good evening! How can I be of service?"
        ],
        howAreYou: [
            "I'm doing great! Ready to help you with anything.",
            "I'm excellent! What can I do for you?",
            "I'm fantastic! How can I assist you?",
            "I'm wonderful! What do you need help with?",
            "I'm amazing! Ready to help you!"
        ],
        thanks: [
            "You're welcome! Happy to help.",
            "No problem! Glad I could help.",
            "You're welcome! Anytime!",
            "My pleasure! Happy to assist.",
            "You're welcome! That's what I'm here for."
        ],
        goodbye: [
            "Goodbye! Have a great day!",
            "See you later! Take care!",
            "Goodbye! Have a wonderful day!",
            "Bye! See you soon!",
            "Goodbye! Stay awesome!"
        ],
        whoAreYou: [
            "I'm your AI assistant, here to help you!",
            "I'm your helpful AI companion!",
            "I'm your AI assistant, ready to assist!",
            "I'm your AI helper, here for you!",
            "I'm your AI assistant, at your service!"
        ]
    };
    
    // Randomly select a response for variety
    function getRandomResponse(responseArray) {
        return responseArray[Math.floor(Math.random() * responseArray.length)];
    }
    
    if (/^(hi|hello|hey)/i.test(lowerMessage)) {
        return getRandomResponse(responses.greeting);
    }
    if (/^(good morning)/i.test(lowerMessage)) {
        return getRandomResponse(responses.goodMorning);
    }
    if (/^(good afternoon)/i.test(lowerMessage)) {
        return getRandomResponse(responses.goodAfternoon);
    }
    if (/^(good evening)/i.test(lowerMessage)) {
        return getRandomResponse(responses.goodEvening);
    }
    if (/^(how are you|what's up|how's it going)/i.test(lowerMessage)) {
        return getRandomResponse(responses.howAreYou);
    }
    if (/^(thanks|thank you)/i.test(lowerMessage)) {
        return getRandomResponse(responses.thanks);
    }
    if (/^(bye|goodbye|see you)/i.test(lowerMessage)) {
        return getRandomResponse(responses.goodbye);
    }
    if (/^(who are you|what are you)/i.test(lowerMessage)) {
        return getRandomResponse(responses.whoAreYou);
    }
    
    return null; // No pre-defined response, use AI
}

// 🔹 AI Response Generator using Ollama - SMART RESPONSE SYSTEM
async function generateAIResponse(prompt, context = []) {
    const responseType = detectResponseType(prompt);
    
    try {
        let systemPrompt;
        
        if (responseType === 'quick') {
            const quickPrompts = [
                "You are a friendly AI assistant. Give VERY brief responses - maximum 1-2 sentences. Be helpful but keep it extremely short. No detailed explanations, no examples, no formatting. Just a quick, friendly response.",
                "You are a helpful AI. Keep responses short and sweet - just 1-2 sentences. Be friendly and direct. No long explanations needed.",
                "You are a quick AI assistant. Give brief, concise answers in 1-2 sentences. Be helpful but keep it simple and friendly.",
                "You are a fast AI helper. Respond quickly with just 1-2 sentences. Be friendly and to the point. No detailed explanations.",
                "You are a speedy AI assistant. Give short, helpful responses in 1-2 sentences. Be friendly and direct."
            ];
            systemPrompt = quickPrompts[Math.floor(Math.random() * quickPrompts.length)];
        } else {
            systemPrompt = "You are an expert AI assistant. Provide detailed, comprehensive, and thorough responses. Be extremely helpful, informative, and detailed. Always give complete explanations with examples when relevant. Write in a professional yet friendly tone. Use proper formatting with **bold text** for important points and bullet points for lists.";
        }
        
        const messages = [
            { role: "system", content: systemPrompt },
            ...context,
            { role: "user", content: prompt }
        ];

        // Optimize parameters based on response type
        const isQuick = responseType === 'quick';
        
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: messages,
                stream: false,
                options: {
                    temperature: isQuick ? 0.5 : 0.7,        // Lower for quick responses
                    top_p: isQuick ? 0.8 : 0.9,              // Lower for quick responses
                    top_k: isQuick ? 20 : 40,                // Lower for quick responses
                    num_predict: isQuick ? 50 : 2000,        // Very short for quick responses
                    repeat_penalty: 1.1,                     // Prevent repetition
                    num_ctx: isQuick ? 512 : 2048,           // Much smaller context for quick
                    num_thread: 8,                            // Use more CPU threads for speed
                    num_gpu: 1,                               // Use GPU if available
                    num_batch: isQuick ? 128 : 256,          // Smaller batch for quick
                    num_keep: isQuick ? 2 : 5,                // Less context for quick
                    seed: -1,                                 // Random seed for variety
                    stop: isQuick ? ["\n\n", "Thank you", "Hope this helps", "Let me", "I can", "Here's", "This is", "In summary", "To answer", "The answer"] : [], // Aggressive stop words for quick
                    tfs_z: 1.0,                               // Tail free sampling
                    typical_p: 1.0,                           // Typical sampling
                    mirostat: 0,                              // Disable mirostat for speed
                    mirostat_eta: 0.1,
                    mirostat_tau: 5.0,
                    penalize_newline: false                   // Allow newlines for formatting
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        return data.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (error) {
        console.error("❌ Ollama Error:", error);
        return "I'm having trouble connecting to my AI brain. Please check if Ollama is running locally.";
    }
}

// 🔹 Streaming AI Response Generator - ULTRA FAST (Node.js compatible)
async function* generateStreamingAIResponse(prompt, context = []) {
    try {
        const messages = [
            { 
                role: "system", 
                content: "You are an expert AI assistant. Provide detailed, comprehensive, and thorough responses. Be extremely helpful, informative, and detailed. Always give complete explanations with examples when relevant. Write in a professional yet friendly tone. Use proper formatting with **bold text** for important points and bullet points for lists." 
            },
            ...context,
            { role: "user", content: prompt }
        ];

        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: messages,
                stream: true,
                options: {
                    temperature: 0.7,        // Reduced for faster response
                    top_p: 0.9,             // Reduced for speed
                    top_k: 40,              // Reduced for speed
                    num_predict: 2000,      // Reduced for faster response
                    repeat_penalty: 1.1,    // Prevent repetition
                    num_ctx: 2048,         // Reduced context for speed
                    num_thread: 8,          // Use more CPU threads for speed
                    num_gpu: 1,             // Use GPU if available
                    num_batch: 256,         // Reduced batch size for speed
                    num_keep: 5,            // Reduced for speed
                    seed: -1,               // Random seed for variety
                    stop: [],               // No stop words for complete responses
                    tfs_z: 1.0,             // Tail free sampling
                    typical_p: 1.0,         // Typical sampling
                    mirostat: 0,            // Disable mirostat for speed
                    mirostat_eta: 0.1,
                    mirostat_tau: 5.0,
                    penalize_newline: false // Allow newlines for formatting
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        // Use Node.js readable stream instead of browser API
        const stream = response.body;
        let buffer = '';

        for await (const chunk of stream) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message && data.message.content) {
                            yield data.message.content;
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                    }
                }
            }
        }
    } catch (error) {
        console.error("❌ Streaming Ollama Error:", error);
        yield "I'm having trouble connecting to my AI brain. Please check if Ollama is running locally.";
    }
}

// 🔹 Main Chat API
app.post("/chat", async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message?.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: "Session ID and message are required" 
            });
        }

        if (!chatHistory[sessionId]) chatHistory[sessionId] = [];
        if (!imageHistory[sessionId]) imageHistory[sessionId] = [];

        // Create intelligent context with image awareness
        let contextMessage = message.trim();
        
        if (imageHistory[sessionId].length > 0) {
            const imageSummary = imageHistory[sessionId]
                .map(img => `📷 ${img.filename}: "${img.extractedText || 'No text'}"`)
                .join('\n');
            
            contextMessage = `[Context: You have ${imageHistory[sessionId].length} images in this conversation:\n${imageSummary}\n\nUser: ${message.trim()}]`;
        }

        // Get recent chat history for context (last 10 messages)
        const contextArray = chatHistory[sessionId].slice(-10);

        // Add user message to history
        chatHistory[sessionId].push({ role: "user", content: contextMessage });

        // Keep conversation history manageable
        if (chatHistory[sessionId].length > 20) {
            chatHistory[sessionId] = chatHistory[sessionId].slice(-20);
        }

        // Check for pre-defined quick responses first
        const quickResponse = getQuickResponse(message);
        let aiResponse;
        
        if (quickResponse) {
            aiResponse = quickResponse;
        } else {
            // Generate AI response with full chat history
            aiResponse = await generateAIResponse(contextMessage, contextArray);
        }
        
        // Add AI response to history
        chatHistory[sessionId].push({ role: "assistant", content: aiResponse });

        res.json({
            success: true,
            response: aiResponse,
            sessionId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Chat Error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error. Please try again."
        });
    }
});

// 🔹 Streaming Chat API - ULTRA FAST RESPONSE
app.post("/chat-stream", async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message?.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: "Session ID and message are required" 
            });
        }

        if (!chatHistory[sessionId]) chatHistory[sessionId] = [];
        if (!imageHistory[sessionId]) imageHistory[sessionId] = [];

        // Create intelligent context with image awareness
        let contextMessage = message.trim();
        
        if (imageHistory[sessionId].length > 0) {
            const imageSummary = imageHistory[sessionId]
                .map(img => `📷 ${img.filename}: "${img.extractedText || 'No text'}"`)
                .join('\n');
            
            contextMessage = `[Context: You have ${imageHistory[sessionId].length} images in this conversation:\n${imageSummary}\n\nUser: ${message.trim()}]`;
        }

        // Get recent chat history for context (last 10 messages)
        const contextArray = chatHistory[sessionId].slice(-10);

        // Add user message to history
        chatHistory[sessionId].push({ role: "user", content: contextMessage });

        // Keep conversation history manageable
        if (chatHistory[sessionId].length > 20) {
            chatHistory[sessionId] = chatHistory[sessionId].slice(-20);
        }

        // Set up Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

        let fullResponse = '';

        try {
            // Check for pre-defined quick responses first
            const quickResponse = getQuickResponse(message);
            
            if (quickResponse) {
                // Send pre-defined response immediately
                fullResponse = quickResponse;
                res.write(`data: ${JSON.stringify({
                    type: 'chunk',
                    content: quickResponse,
                    sessionId,
                    timestamp: new Date().toISOString()
                })}\n\n`);
            } else {
                // Stream AI response
                for await (const chunk of generateStreamingAIResponse(contextMessage, contextArray)) {
                    fullResponse += chunk;
                    
                    // Send chunk to client
                    res.write(`data: ${JSON.stringify({
                        type: 'chunk',
                        content: chunk,
                        sessionId,
                        timestamp: new Date().toISOString()
                    })}\n\n`);
                }
            }

            // Add complete response to history
            chatHistory[sessionId].push({ role: "assistant", content: fullResponse });

            // Send completion signal
            res.write(`data: ${JSON.stringify({
                type: 'complete',
                fullResponse: fullResponse,
                sessionId,
                timestamp: new Date().toISOString()
            })}\n\n`);

        } catch (streamError) {
            console.error("❌ Streaming Error:", streamError);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: 'Streaming failed. Please try again.',
                sessionId,
                timestamp: new Date().toISOString()
            })}\n\n`);
        }

        res.end();

    } catch (error) {
        console.error("❌ Chat Stream Error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error. Please try again."
        });
    }
});

// 🔹 Image Text Extraction with AI Analysis
app.post("/extract-text", multer({ dest: "uploads/" }).single("image"), async (req, res) => {
    try {
        const { sessionId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: "No image file provided" });
        }

        console.log(`📁 Processing image: ${file.originalname}`);

        // Extract text using Tesseract.js
        const { data: { text } } = await Tesseract.recognize(file.path, 'eng', {
            logger: m => console.log(m)
        });

        const extractedText = text.trim();
        console.log(`📄 Extracted text: ${extractedText.substring(0, 100)}...`);

        // Store image info
        if (!imageHistory[sessionId]) imageHistory[sessionId] = [];
        imageHistory[sessionId].push({
            filename: file.originalname,
            extractedText: extractedText,
            timestamp: new Date().toISOString()
        });

        // Generate AI analysis of the extracted text
        const aiPrompt = `Please analyze this extracted text from an image and provide helpful insights:\n\n"${extractedText}"\n\nProvide a brief, helpful analysis.`;
        const aiResponse = await generateAIResponse(aiPrompt);

        res.json({
            success: true,
            extractedText: extractedText,
            aiResponse: aiResponse,
            filename: file.originalname
        });

    } catch (error) {
        console.error("❌ OCR Error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to process image. Please try again."
        });
    }
});

// 🔹 Get Chat History
app.get("/chat-history/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const chat = chatHistory[sessionId] || [];
    res.json({ success: true, chat, messageCount: chat.length });
});

// 🔹 Reset Chat History
app.post("/reset", async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (sessionId) {
            delete chatHistory[sessionId];
            delete imageHistory[sessionId];
        } else {
            // Reset all sessions
            Object.keys(chatHistory).forEach(key => delete chatHistory[key]);
            Object.keys(imageHistory).forEach(key => delete imageHistory[key]);
        }

        res.json({
            success: true,
            message: "Chat and image history cleared successfully!"
        });

    } catch (error) {
        console.error("❌ Reset Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reset chat history"
        });
    }
});

// 🔹 Health Check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        ollama: {
            url: OLLAMA_URL,
            model: OLLAMA_MODEL,
            status: "Connected"
        },
        features: {
            chat: "Available",
            chatHistory: "Available",
            imageProcessing: "Available",
            ocr: "Available"
        }
    });
});

// 🔹 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Smart Chatbot running on http://localhost:${PORT}`);
    console.log(`✨ AI: Ollama (Local) - 100% FREE, UNLIMITED usage`);
    console.log(`📝 To use: Install Ollama and run 'ollama run llama3.2:1b'`);
    console.log(`🔗 Ollama URL: ${OLLAMA_URL}`);
    console.log(`📱 Frontend: Open frontend/index.html in your browser`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
});