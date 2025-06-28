// ------------------------- Configuration & Injection -------------------------
const codingDescContainerClass = "py-4 px-3 coding_desc_container__gdB9M";
const GEMINI_API_KEY = "YOUR_API_KEY_HERE"; // placeholder only


// Inject inject.js on every page load
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

// Global store for problem data
window.__problemDataMap = {};

// ------------------------- Utility: Local Storage Chat History -------------------------
function getChatHistory(problemId) {
    const raw = localStorage.getItem(`chat_history_${problemId}`);
    const parsed = raw ? JSON.parse(raw) : [];

    return parsed.map(entry => ({
        role: entry.role,
        parts: entry.parts || [{ text: entry.text || "" }]
    }));
}

function saveChatMessage(problemId, role, message) {
    const history = getChatHistory(problemId);
    history.push({ role, parts: [{ text: message }] });
    localStorage.setItem(`chat_history_${problemId}`, JSON.stringify(history.slice(-20)));
}

// ------------------------- Utility: Problem Context Extractors -------------------------
function getCurrentProblemId() {
    const idMatch = window.location.pathname.match(/-(\d+)(?:\?|$)/);
    return idMatch ? idMatch[1] : null;
}

function getCurrentProblemData() {
    const id = getCurrentProblemId();
    return id ? window.__problemDataMap[id] : null;
}

function getProblemHeading() {
    const heading = document.querySelector("h4.coding_problem_info_heading__G9uel");
    return heading ? heading.textContent.trim() : null;
}

function getSectionByHeading(headingText) {
    const heading = [...document.querySelectorAll('h5.problem_heading')]
        .find(h => h.textContent.trim().toLowerCase() === headingText.toLowerCase());

    const contentDiv = heading?.nextElementSibling?.querySelector('.markdown-renderer');
    if (!contentDiv) return null;

    const cloned = contentDiv.cloneNode(true);
    cloned.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    cloned.querySelectorAll('i, sup, span.math-inline').forEach(el => el.replaceWith(el.textContent));

    return cloned.textContent.trim();
}

function getProblemDescription() {
    const container = document.querySelector("div.markdown-renderer");
    if (!container) return null;

    const cloned = container.cloneNode(true);
    cloned.querySelectorAll("span.math-inline").forEach(el => el.remove());
    return cloned.textContent.trim().slice(0, 1500);
}

function getUserCodeFromLocalStorage() {
    const problemId = getCurrentProblemId();
    if (!problemId) return null;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith("course_")) continue;

        const parts = key.split("_");
        if (parts[2] === problemId) {
            const value = localStorage.getItem(key);
            console.log(`Matched key: ${key}`);
            return value;
        }
    }

    return null;
}

// ------------------------- Utility: Chat UI -------------------------
function appendMessage(text, isAI = false, isError = false) {
    const chatMessages = document.getElementById('chat-messages');
    const msgElem = document.createElement('div');

    msgElem.style.marginBottom = '10px';
    if (isError) msgElem.style.color = 'red';

    if (isAI) {
        const formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        msgElem.innerHTML = "<strong>AI:</strong><br>" + formatted;
    } else {
        msgElem.textContent = "You: " + text;
    }

    chatMessages.appendChild(msgElem);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderStoredChatHistory() {
    const problemId = getCurrentProblemId();
    const chatBox = document.getElementById("chat-messages");
    if (!problemId || !chatBox) return;

    const messages = getChatHistory(problemId);
    chatBox.innerHTML = "";

    for (const message of messages) {
        const msgDiv = document.createElement("div");
        msgDiv.className = message.role === "user" ? "user-message" : "ai-message";
        msgDiv.textContent = message.parts?.[0]?.text || message.text || "";
        chatBox.appendChild(msgDiv);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}

// ------------------------- AI Call to Gemini -------------------------
async function callGeminiAPI(problemContext, userMessage) {
    const problemId = getCurrentProblemId();
    const problemData = getCurrentProblemData();
    const history = getChatHistory(problemId);
    const title = getProblemHeading() || "Unknown";
    const inputFormat = getSectionByHeading("Input Format") || "Not provided.";
    const outputFormat = getSectionByHeading("Output Format") || "Not provided.";
    const constraints = getSectionByHeading("Constraints") || "Not provided.";
    const userCode = getUserCodeFromLocalStorage();

    let description = "", hint1 = "", hint2 = "", solutionApproach = "", cppSolution = "";
    if (problemData) {
        description = problemData.description?.slice(0, 1500) || "";
        hint1 = problemData.hint1 || "";
        hint2 = problemData.hint2 || "";
        solutionApproach = problemData.solutionApproach || "";
        if (Array.isArray(problemData.editorialCode)) {
            cppSolution = problemData.editorialCode.find(x => x.language?.includes("C++"))?.code || "";
        }
    }

    const fullContextPrompt = {
        role: "user",
        parts: [{
            text: `
You are a strict AI coding mentor helping a student solve a programming problem.
DO NOT give full solutions unless the user explicitly says "I give up" or "show the full code".

Only respond to queries related to the current problem.

Problem Title: ${title}
Description: ${description}
Input Format: ${inputFormat}
Output Format: ${outputFormat}
Constraints: ${constraints}

Hints:
- ${hint1}
- ${hint2}

Approach: ${solutionApproach}
Editorial Code Snippet:
${cppSolution.slice(0, 2000)}

User Code:
${userCode || "No code written yet."}
            `.trim()
        }]
    };

    const conversation = [fullContextPrompt, ...history, {
        role: "user",
        parts: [{ text: userMessage }]
    }];

    saveChatMessage(problemId, "user", userMessage);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: conversation })
    });

    const data = await res.json();
    console.log("📥 Gemini Response", data);

    const aiMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
    saveChatMessage(problemId, "model", aiMessage);

    return aiMessage;
}

// ------------------------- UI Components -------------------------
function createChatbox(container) {
    const chatBox = document.createElement('div');
    chatBox.id = 'ai-chatbox';

    Object.assign(chatBox.style, {
        backgroundColor: '#ffffff',
        border: '2px solid #05445e',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        padding: '10px',
        marginTop: '10px',
        width: '100%',
        maxWidth: '600px',
        boxSizing: 'border-box',
        fontSize: '14px'
    });

    chatBox.innerHTML = `
        <div style="background:#05445e; color:white; padding:10px; font-weight:bold; border-radius:5px 5px 0 0;">
            AI Chat
        </div>
        <div id="chat-messages" style="height:200px; overflow-y:auto; padding:10px; border-top:1px solid #eee;"></div>
        <div style="padding-top:10px; display:flex; gap:5px;">
            <input id="chat-input" type="text" placeholder="Ask something about this problem..." style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px;" />
            <button id="chat-send" style="background:#05445e; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Send</button>
            <button id="chat-close" style="background:#ccc; color:black; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">X</button>
        </div>
    `;

    container.appendChild(chatBox);
    renderStoredChatHistory();

    document.getElementById('chat-close').onclick = () => chatBox.remove();

    document.getElementById('chat-send').onclick = async () => {
        const input = document.getElementById('chat-input');
        const userMessage = input.value.trim();
        if (!userMessage) return;

        appendMessage(userMessage);
        input.value = '';

        const typingElem = document.createElement('div');
        typingElem.textContent = "AI: ...";
        document.getElementById('chat-messages').appendChild(typingElem);

        try {
            const context = getProblemDescription();
            const aiResponse = await callGeminiAPI(context, userMessage);
            typingElem.remove();
            appendMessage(aiResponse, true);
        } catch {
            typingElem.remove();
            appendMessage("AI: (error occurred)", true, true);
        }
    };
}

function injectButtonAndChat() {
    if (!location.pathname.startsWith('/problems')) {
        removeChatUI();
        return;
    }

    if (document.getElementById('ai-help-button')) return;

    const container = document.getElementsByClassName(codingDescContainerClass)[0];
    if (!container) return;

    const button = document.createElement('button');
    button.id = 'ai-help-button';
    button.innerText = 'AI Help';

    Object.assign(button.style, {
        backgroundColor: '#05445e',
        color: 'white',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        marginBottom: '10px'
    });

    button.onclick = () => {
        if (!document.getElementById('ai-chatbox')) {
            createChatbox(container);
        }
    };

    container.appendChild(button);
}

function removeChatUI() {
    const button = document.getElementById('ai-help-button');
    const chat = document.getElementById('ai-chatbox');
    if (button) button.remove();
    if (chat) chat.remove();
}

// ------------------------- Problem Metadata Listener -------------------------
window.addEventListener("maangProblemData", (event) => {
    const data = event.detail;
    if (!data || !data.problemId) return;

    window.__problemDataMap[data.problemId] = {
        title: data.title,
        description: data.description,
        inputFormat: data.inputFormat,
        outputFormat: data.outputFormat,
        constraints: data.constraints,
        tags: data.tags,
        hint1: data.hint1,
        hint2: data.hint2,
        solutionApproach: data.solutionApproach,
        editorialCode: data.editorialCode
    };

    console.log(`[Gemini Extension] Metadata stored for problem ${data.problemId}`);
});

// ------------------------- SPA Route Monitoring -------------------------
let lastPath = location.pathname;
const observer = new MutationObserver(() => {
    const currentPath = location.pathname;
    if (currentPath !== lastPath) {
        lastPath = currentPath;
        removeChatUI();
        injectButtonAndChat();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// ------------------------- Initial Setup -------------------------
injectButtonAndChat();
document.addEventListener("DOMContentLoaded", renderStoredChatHistory);
window.addEventListener("popstate", renderStoredChatHistory);
