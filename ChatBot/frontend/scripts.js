document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chatBox");
    const userInput = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const micBtn = document.getElementById("micBtn");
    const fileBtn = document.getElementById("fileBtn");
    const fileInput = document.getElementById("fileInput");
    const sessionId = Date.now().toString();

    // 🎤 Enhanced Microphone setup
    const recognition = setupMicrophone();

    // Track microphone state to prevent multiple clicks
    let micActive = false;

    micBtn.addEventListener("click", function () {
        // Prevent multiple clicks while microphone is active
        if (micActive) {
            return;
        }

        if (recognition) {
            try {
                micActive = true;
                recognition.start();
            } catch (error) {
                console.error('🎤 Error starting recognition:', error);
                micActive = false;
                // No error message - just fail silently
            }
        } else {
            // No error message - just fail silently
            console.warn('Speech recognition not supported in this browser');
        }
    });

    // 📁 Handle File Upload & OCR Processing
    fileBtn.addEventListener("click", function () {
        fileInput.click();
    });

    fileInput.addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (!file) return;

        appendMessage(`📁 Uploading: ${file.name}`, "user");

        let formData = new FormData();
        formData.append("image", file);
        formData.append("sessionId", sessionId);

        // Show typing animation
        showTypingAnimation();

        try {
            const response = await fetch("http://localhost:5000/extract-text", {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            // Hide typing animation
            hideTypingAnimation();
            
            if (data.success) {
                appendMessage(`📄 **Image Analysis Complete!**<br><br>**Extracted Text:**<br>${data.extractedText}<br><br>**AI Insights:**<br>${data.aiResponse}`, "ai", true);
            } else {
                appendMessage(`⚠️ ${data.error}`, "ai");
            }
        } catch (error) {
            console.error("❌ Error:", error);
            // Hide typing animation
            hideTypingAnimation();
            appendMessage("⚠️ Error processing the image. Please try again.", "ai");
        }
        
        // Clear file input
        fileInput.value = "";
    });

    // ✉️ Function to append messages to chat
    function appendMessage(content, type = "user", isHTML = false) {
        const messageWrapper = document.createElement("div");
        messageWrapper.className = `message-wrapper ${type}-wrapper`;
        
        const message = document.createElement("div");
        message.className = `message ${type}-message`;
        
        if (isHTML) {
            message.innerHTML = content;
        } else {
            message.textContent = content;
        }
        
        messageWrapper.appendChild(message);
        chatBox.appendChild(messageWrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 🎯 Smart typing animation - shows first, then quick response
    function showTypingAnimation() {
        const messageWrapper = document.createElement("div");
        messageWrapper.className = "message-wrapper ai-wrapper";
        messageWrapper.id = "typing-indicator";
        
        const message = document.createElement("div");
        message.className = "message ai-message typing-message";
        message.innerHTML = `
            <div class="typing-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
            <span class="typing-text">AI is thinking...</span>
        `;
        
        messageWrapper.appendChild(message);
        chatBox.appendChild(messageWrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 🚀 Quick response animation - for simple questions
    function showQuickTypingAnimation() {
        const messageWrapper = document.createElement("div");
        messageWrapper.className = "message-wrapper ai-wrapper";
        messageWrapper.id = "typing-indicator";
        
        const message = document.createElement("div");
        message.className = "message ai-message typing-message";
        message.innerHTML = `
            <div class="typing-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
            <span class="typing-text">Quick response coming...</span>
        `;
        
        messageWrapper.appendChild(message);
        chatBox.appendChild(messageWrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 🚫 Remove typing animation
    function hideTypingAnimation() {
        const typingIndicator = document.getElementById("typing-indicator");
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // 📝 Format text with proper line breaks and formatting
    function formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text with double stars **text**
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold text with double stars (alternative pattern)
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text with single stars *text*
            .replace(/\n\n/g, '<br><br>') // Double line breaks
            .replace(/\n/g, '<br>'); // Single line breaks
    }

    // ⌨️ Typewriter effect - ULTRA FAST with optimized speed
    function typewriterEffect(text, element, speed = 5) {
        // First format the text properly
        const formattedText = formatText(text);
        
        // Create a temporary element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formattedText;
        
        // Get all text nodes and elements
        const walker = document.createTreeWalker(
            tempDiv,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        
        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            nodes.push(node);
        }
        
        let nodeIndex = 0;
        let charIndex = 0;
        const cursor = document.createElement("span");
        cursor.className = "typing-cursor";
        cursor.textContent = "|";
        element.appendChild(cursor);
        
        function type() {
            if (nodeIndex < nodes.length) {
                const currentNode = nodes[nodeIndex];
                
                if (currentNode.nodeType === Node.TEXT_NODE) {
                    const text = currentNode.textContent;
                    if (charIndex < text.length) {
                        element.insertBefore(document.createTextNode(text.charAt(charIndex)), cursor);
                        charIndex++;
                        setTimeout(type, speed);
                    } else {
                        nodeIndex++;
                        charIndex = 0;
                        setTimeout(type, speed);
                    }
                } else {
                    // It's an element, clone it
                    const clonedElement = currentNode.cloneNode(true);
                    element.insertBefore(clonedElement, cursor);
                    nodeIndex++;
                    setTimeout(type, speed);
                }
            } else {
                // Remove cursor after typing is complete
                setTimeout(() => {
                    if (cursor.parentNode) {
                        cursor.parentNode.removeChild(cursor);
                    }
                }, 1000);
            }
        }
        
        type();
    }

    // 🚀 Streaming typewriter effect - renders text as it arrives
    function streamingTypewriterEffect(element, speed = 3) {
        const cursor = document.createElement("span");
        cursor.className = "typing-cursor";
        cursor.textContent = "|";
        element.appendChild(cursor);
        
        return {
            addText: function(text) {
                // Format and add text immediately
                const formattedText = formatText(text);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = formattedText;
                
                // Add formatted content before cursor
                while (tempDiv.firstChild) {
                    element.insertBefore(tempDiv.firstChild, cursor);
                }
                
                // Auto-scroll to bottom
                chatBox.scrollTop = chatBox.scrollHeight;
            },
            complete: function() {
                // Remove cursor after completion
                setTimeout(() => {
                    if (cursor.parentNode) {
                        cursor.parentNode.removeChild(cursor);
                    }
                }, 1000);
            }
        };
    }

    // 🎤 Microphone popup functions
    let micPopupTimeout;

    function showMicPopup() {
        // Remove existing popup if any
        hideMicPopup();
        
        // Create dialog element
        const dialog = document.createElement("div");
        dialog.id = "mic-popup";
        dialog.className = "mic-dialog";
        dialog.innerHTML = `
            <div class="mic-dialog-content">
                <div class="mic-dialog-icon">🎤</div>
                <div class="mic-dialog-text">Listening... Please speak clearly.</div>
                <div class="mic-dialog-dots">
                    <span class="mic-dot"></span>
                    <span class="mic-dot"></span>
                    <span class="mic-dot"></span>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(dialog);
        
        // Auto-hide after 10 seconds
        micPopupTimeout = setTimeout(() => {
            hideMicPopup();
        }, 10000);
    }

    function hideMicPopup() {
        const popup = document.getElementById("mic-popup");
        if (popup) {
            popup.remove();
        }
        
        // Clear timeout if exists
        if (micPopupTimeout) {
            clearTimeout(micPopupTimeout);
            micPopupTimeout = null;
        }
    }

    // 🚨 Error popup function
    function showErrorPopup(errorMessage) {
        // Remove existing error popup if any
        const existingError = document.getElementById("mic-error-popup");
        if (existingError) {
            existingError.remove();
        }
        
        // Create error popup element
        const errorPopup = document.createElement("div");
        errorPopup.id = "mic-error-popup";
        errorPopup.className = "mic-error-popup";
        errorPopup.innerHTML = `
            <div class="mic-error-content">
                <div class="mic-error-icon">⚠️</div>
                <div class="mic-error-text">${errorMessage}</div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(errorPopup);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            const errorMsg = document.getElementById("mic-error-popup");
            if (errorMsg) {
                errorMsg.remove();
            }
        }, 5000);
    }

    // 🎤 Enhanced microphone setup with clean error handling
    function setupMicrophone() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return null;
        }

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Track if error message is already shown to prevent duplicates
        let errorShown = false;

        recognition.onstart = function() {
            console.log('🎤 Speech recognition started');
            errorShown = false; // Reset error flag when starting
            showMicPopup(); // Show popup instead of chat message
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            console.log('🎤 Speech recognized:', transcript);
            micActive = false; // Reset mic active flag
            hideMicPopup(); // Hide popup when speech is recognized
            
            // Put recognized text in input field for user to edit and send
            userInput.value = transcript;
            userInput.focus();
            // Don't auto-send - wait for user to click send button
        };

        recognition.onerror = function(event) {
            console.error('🎤 Speech recognition error:', event.error);
            
            // Hide dialog and show error message for 10 seconds
            hideMicPopup();
            
            // Only show error message once
            if (errorShown) return;
            errorShown = true;
            
            let errorMessage = "⚠️ ";
            
            switch(event.error) {
                case 'no-speech':
                    errorMessage += "No speech detected. Please try again.";
                    break;
                case 'audio-capture':
                    errorMessage += "Microphone not accessible. Please check permissions.";
                    break;
                case 'not-allowed':
                    errorMessage += "Microphone access denied. Please allow microphone access.";
                    break;
                case 'network':
                    errorMessage += "Network error. Please check your connection.";
                    break;
                default:
                    errorMessage += "Sorry, I couldn't hear you. Please try again.";
            }
            
            // Show error message as popup for 10 seconds
            showErrorPopup(errorMessage);
        };

        recognition.onend = function() {
            console.log('🎤 Speech recognition ended');
            micActive = false; // Reset mic active flag when recognition ends
            hideMicPopup(); // Hide popup when recognition ends
        };

        return recognition;
    }

    // 🧠 Smart question detection
    function detectQuestionType(message) {
        const quickPatterns = [
            /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
            /^(how are you|what's up|how's it going)/i,
            /^(thanks|thank you|bye|goodbye|see you)/i,
            /^(yes|no|ok|okay|sure|alright)/i,
            /^(what time|what day|what date)/i,
            /^(who are you|what are you)/i
        ];
        
        for (const pattern of quickPatterns) {
            if (pattern.test(message.trim())) {
                return 'quick';
            }
        }
        
        return message.length < 50 ? 'quick' : 'detailed';
    }

    // 📩 Send user messages with SMART RESPONSE SYSTEM
    function sendMessage(text) {
        text = text.trim();
        if (!text) return;

        appendMessage(text, "user");
        userInput.value = "";
        userInput.disabled = true;
        sendBtn.disabled = true;

        // Check for special commands
        if (text.toLowerCase().includes("reset") || text.toLowerCase().includes("clear")) {
            resetChat();
            return;
        }

        // Detect question type and show appropriate animation
        const questionType = detectQuestionType(text);
        
        if (questionType === 'quick') {
            showQuickTypingAnimation();
        } else {
        showTypingAnimation();
        }

        // Wait exactly 1 second before starting response
        setTimeout(() => {
            // Hide typing animation
            hideTypingAnimation();
            
            // Create AI message container AFTER hiding typing animation
                const messageWrapper = document.createElement("div");
                messageWrapper.className = "message-wrapper ai-wrapper";
                
                const message = document.createElement("div");
                message.className = "message ai-message";
                
                messageWrapper.appendChild(message);
                chatBox.appendChild(messageWrapper);
                chatBox.scrollTop = chatBox.scrollHeight;
                
            // Initialize streaming typewriter
            const streamer = streamingTypewriterEffect(message);
            
            // Start the actual request after 1 second delay
            startChatRequest(text, sessionId, streamer, message, questionType);
        }, 1000);
    }

    // 📩 Start the actual chat request (separated for timing control)
    function startChatRequest(text, sessionId, streamer, message, questionType) {

        // Try streaming first, fallback to regular chat if streaming fails
        fetch("http://localhost:5000/chat-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, message: text }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            function readStream() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        streamer.complete();
                        return;
                    }
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                if (data.type === 'chunk') {
                                    streamer.addText(data.content);
                                } else if (data.type === 'complete') {
                                    streamer.complete();
                                } else if (data.type === 'error') {
                                    appendMessage(`⚠️ ${data.error}`, "ai");
                                    streamer.complete();
                                }
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                    
                    return readStream();
                });
            }
            
            return readStream();
        })
        .catch(error => {
            console.error("⚠️ Streaming Error, falling back to regular chat:", error);
            
            // Fallback to regular chat with ultra-fast typewriter
            fetch("http://localhost:5000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, message: text }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Use smart typewriter speed based on question type
                    const speed = questionType === 'quick' ? 2 : 3; // Even faster for quick responses
                    typewriterEffect(data.response, message, speed);
            } else {
                appendMessage(`⚠️ ${data.error}`, "ai");
            }
                streamer.complete();
            })
            .catch(fallbackError => {
                console.error("⚠️ Fallback Error:", fallbackError);
            appendMessage("⚠️ Something went wrong. Try again later.", "ai");
                streamer.complete();
            });
        })
        .finally(() => {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        });
    }

    // 🔄 Reset chat and images
    async function resetChat() {
        try {
            const response = await fetch("http://localhost:5000/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });

            const data = await response.json();
            if (data.success) {
                chatBox.innerHTML = "";
                appendMessage("🔄 Chat and image history cleared successfully!", "ai");
            } else {
                appendMessage(`⚠️ ${data.message}`, "ai");
            }
        } catch (error) {
            console.error("❌ Reset Error:", error);
            appendMessage("⚠️ Failed to reset chat. Please try again.", "ai");
        }
    }

    // Event listeners
    sendBtn.addEventListener("click", () => sendMessage(userInput.value));
    userInput.addEventListener("keydown", (e) => { 
        if (e.key === "Enter") sendMessage(userInput.value); 
    });

    // Welcome message
    appendMessage("👋 Hi! I'm your AI assistant. How I  can help you!", "ai");

    // Make functions globally available for HTML buttons
    window.resetChat = resetChat;
});
