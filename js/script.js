/**
 * ==========================================================================
 * ADSY Technology AI Chatbot - Pure Frontend UI Script
 * ==========================================================================
 * IMPORTANT:
 * - This file handles FRONTEND UI transitions and UI components ONLY.
 * - Zero mock AI responses, zero fake typing, zero backend logic here.
 * - Exposes clean integration hooks for existing backend/API connection.
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatInterface = document.getElementById('chatInterface');
    
    const heroChatForm = document.getElementById('heroChatForm');
    const heroInput = document.getElementById('heroInput');
    
    const dockChatForm = document.getElementById('dockChatForm');
    const dockInput = document.getElementById('dockInput');
    
    const chatFeed = document.getElementById('chatFeed');
    const emptyChatState = document.getElementById('emptyChatState');
    
    const btnNewChat = document.getElementById('btnNewChat');
    const btnClearChat = document.getElementById('btnClearChat');

    // ==========================================================================
    // FASTAPI BACKEND INTEGRATION
    // ==========================================================================
    
    const API_URL = "http://127.0.0.1:8000/chat";
    const STORAGE_KEY = "adsy_chat_history";

    function saveMessageToHistory(role, text, timestamp, sources, id) {
        const history = getStoredHistory();
        history.push({ role, text, timestamp, sources: sources || [], id: id || null });
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }

    function getStoredHistory() {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    function clearStoredHistory() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Sends user message to FastAPI backend endpoint
     * @param {string} userMessage 
     * @returns {Promise<string>} AI answer string
     */
    async function sendMessageToBot(userMessage) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: userMessage,
                    session_id: "user_session_1"
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error("Chat request failed:", error);
            return { answer: "Sorry, something went wrong. Please try again.", sources: [] };
        }
    }

    /**
     * Handles user message submission, renders user bubble, loading indicator, and bot reply
     * @param {string} messageText 
     */
    async function handleSendMessage(messageText) {
        const trimmed = messageText.trim();
        if (!trimmed) return;

        showChatInterface();

        if (emptyChatState) {
            emptyChatState.style.display = 'none';
        }

        const timeFormatted = getCurrentTimeFormatted();
        renderUserMessage(trimmed, timeFormatted);

        renderTypingIndicator();

        const botReply = await sendMessageToBot(trimmed);

        removeTypingIndicator();
        renderAIMessage(botReply, getCurrentTimeFormatted());

        scrollToBottom();
    }

    function renderTypingIndicator() {
        if (document.getElementById('adsyTypingIndicator')) return;
        const time = getCurrentTimeFormatted();
        const row = document.createElement('div');
        row.className = 'adsy-message-row ai-row';
        row.id = 'adsyTypingIndicator';

        row.innerHTML = `
            <div class="adsy-ai-meta">
                <div class="adsy-ai-avatar">
                    <img src="assets/adsy-logo.png" alt="ADSY AI">
                </div>
                <span class="adsy-ai-name">ADSY AI</span>
                <span class="adsy-msg-timestamp">${escapeHTML(time)}</span>
            </div>
            <div class="adsy-ai-bubble adsy-typing-bubble">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;

        chatFeed.appendChild(row);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('adsyTypingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // ==========================================================================
    // UI RENDERERS (Exported to window for easy external backend execution)
    // ==========================================================================

    window.renderUserMessage = function(text, timestamp, skipSave) {
        const time = timestamp || getCurrentTimeFormatted();
        
        const row = document.createElement('div');
        row.className = 'adsy-message-row user-row';

        row.innerHTML = `
            <div class="adsy-user-bubble">${escapeHTML(text)}</div>
            <span class="adsy-msg-timestamp">${escapeHTML(time)}</span>
        `;

        chatFeed.appendChild(row);
        if (!skipSave) saveMessageToHistory('user', text, time);
        scrollToBottom();
    };

    window.renderAIMessage = function(data, timestamp, skipSave) {
        let text = "";
        let sources = [];
        let messageId = "";

        if (typeof data === 'object' && data !== null) {
            text = data.answer || data.text || "";
            sources = data.sources || [];
            messageId = data.id || "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        } else {
            text = data || "";
            messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
        }

        const time = timestamp || getCurrentTimeFormatted();
        
        if (emptyChatState) {
            emptyChatState.style.display = 'none';
        }

        let sourcesHTML = "";

        const row = document.createElement('div');
        row.className = 'adsy-message-row ai-row';
        row.setAttribute('data-id', messageId);

        row.innerHTML = `
            <div class="adsy-ai-meta">
                <div class="adsy-ai-avatar">
                    <img src="assets/adsy-logo.png" alt="ADSY AI">
                </div>
                <span class="adsy-ai-name">ADSY AI</span>
                <span class="adsy-msg-timestamp">${escapeHTML(time)}</span>
            </div>
            <div class="adsy-ai-bubble">${DOMPurify.sanitize(marked.parse(text))}</div>
            ${sourcesHTML}
            <div class="adsy-ai-actions">
                <button type="button" class="adsy-action-btn btn-copy" title="Copy message" onclick="copyMessageText(this)">
                    <i class="fa-regular fa-copy"></i> Copy
                </button>
                <button type="button" class="adsy-action-btn btn-regenerate" title="Regenerate message" onclick="handleRegenerateClick(this)">
                    <i class="fa-solid fa-rotate-right"></i> Regenerate
                </button>
            </div>
        `;

        chatFeed.appendChild(row);
        if (!skipSave) saveMessageToHistory('ai', text, time, sources, messageId);
        scrollToBottom();
    };

    // ==========================================================================
    // UI LAYOUT CONTROLLERS
    // ==========================================================================

    function showChatInterface() {
        if (!welcomeScreen.classList.contains('hidden')) {
            welcomeScreen.classList.add('hidden');
        }
        if (chatInterface.classList.contains('hidden')) {
            chatInterface.classList.remove('hidden');
            dockInput.focus();
        }
    }

    function showWelcomeScreen() {
        chatInterface.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        heroInput.value = '';
        heroInput.focus();
    }

    function startNewChat() {
        clearChatMessages();
        showWelcomeScreen();
    }

    function clearChatMessages() {
        const rows = chatFeed.querySelectorAll('.adsy-message-row');
        rows.forEach(r => r.remove());
        if (emptyChatState) {
            emptyChatState.style.display = 'block';
        }
        clearStoredHistory();
    }

    function restoreChatFromHistory() {
        const history = getStoredHistory();
        if (history.length === 0) return;

        showChatInterface();
        if (emptyChatState) {
            emptyChatState.style.display = 'none';
        }

        history.forEach(msg => {
            if (msg.role === 'user') {
                window.renderUserMessage(msg.text, msg.timestamp, true);
            } else {
                window.renderAIMessage(msg, msg.timestamp, true);
            }
        });

        scrollToBottom();
    }

    // ==========================================================================
    // EVENT LISTENERS
    // ==========================================================================

    function bindFormSubmit(formEl, inputEl) {
        if (!formEl || !inputEl) return;
        formEl.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = inputEl.value;
            if (message.trim()) {
                inputEl.value = '';
                handleSendMessage(message);
            }
        });
    }
    bindFormSubmit(heroChatForm, heroInput);
    bindFormSubmit(dockChatForm, dockInput);

    if (btnNewChat) {
        btnNewChat.addEventListener('click', startNewChat);
    }

    if (btnClearChat) {
        btnClearChat.addEventListener('click', clearChatMessages);
    }

    window.copyMessageText = function(btnElement) {
        const bubble = btnElement.closest('.adsy-message-row').querySelector('.adsy-ai-bubble');
        if (bubble) {
            navigator.clipboard.writeText(bubble.innerText).then(() => {
                const originalHTML = btnElement.innerHTML;
                btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
                setTimeout(() => {
                    btnElement.innerHTML = originalHTML;
                }, 2000);
            }).catch(err => {
                console.error('Copy error:', err);
            });
        }
    };

    window.handleRegenerateClick = async function(btnElement) {
        const aiRow = btnElement.closest('.adsy-message-row');
        if (!aiRow) return;

        // Find the user message that came right before this AI response
        const userRow = aiRow.previousElementSibling;
        if (!userRow || !userRow.classList.contains('user-row')) {
            console.error('Could not find the original user message to regenerate from.');
            return;
        }

        const userBubble = userRow.querySelector('.adsy-user-bubble');
        const originalMessage = userBubble ? userBubble.innerText : null;
        if (!originalMessage) return;

        const aiBubble = aiRow.querySelector('.adsy-ai-bubble');
        const originalContent = aiBubble.innerHTML;

        // Show a lightweight loading state inside the existing bubble
        aiBubble.innerHTML = `
            <div class="adsy-typing-bubble" style="padding:0;">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;

        try {
            const botReply = await sendMessageToBot(originalMessage);
            const replyText = typeof botReply === 'object' ? botReply.answer : botReply;
            const replySources = [];

            aiBubble.innerHTML = DOMPurify.sanitize(marked.parse(replyText));
            
            // Remove sources view if it exists
            let sourcesEl = aiRow.querySelector('.adsy-ai-sources');
            if (sourcesEl) {
                sourcesEl.remove();
            }

            updateStoredAIMessage(aiRow, replyText, replySources);
        } catch (error) {
            console.error('Regenerate failed:', error);
            aiBubble.innerHTML = originalContent;
        }
    };

    function updateStoredAIMessage(aiRow, newText, newSources) {
        const messageId = aiRow.getAttribute('data-id');
        if (!messageId) return;

        const history = getStoredHistory();
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'ai' && history[i].id === messageId) {
                history[i].text = newText;
                if (newSources) {
                    history[i].sources = newSources;
                }
                break;
            }
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
    // ==========================================================================
    // UTILITY HELPERS
    // ==========================================================================

    function scrollToBottom() {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }

    function getCurrentTimeFormatted() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function prefillDefaultMessage() {
        // Only prefill if there's no existing chat history (fresh visit)
        const history = getStoredHistory();
        if (history.length === 0 && heroInput) {
            heroInput.value = "Hello, I need some info";
        }
    }

    restoreChatFromHistory();
    prefillDefaultMessage();
});