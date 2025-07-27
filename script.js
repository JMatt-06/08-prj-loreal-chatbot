/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// L'Oréal System Prompt - guides the AI to focus on L'Oréal products only
const SYSTEM_PROMPT = `You are a specialized L'Oréal beauty advisor and product expert. Your ONLY role is to help customers with L'Oréal-related topics:

WHAT YOU CAN HELP WITH:
- L'Oréal product recommendations and detailed information
- Beauty routines using L'Oréal products exclusively
- Skincare and makeup advice with L'Oréal solutions
- Product ingredients and benefits from L'Oréal ranges
- Application tips and techniques for L'Oréal cosmetics
- L'Oréal brand history and innovation
- Comparing different L'Oréal product lines

CONVERSATION CONTEXT TRACKING:
- Remember the user's name when provided and use it naturally in conversation
- Track their skin type, concerns, and preferences mentioned earlier
- Reference previous product recommendations and follow up on them
- Build on past questions to provide more personalized advice
- Remember their beauty goals and routine preferences

STRICT GUIDELINES:
- NEVER discuss competitors or non-L'Oréal brands
- ALWAYS politely decline questions about other beauty brands
- If asked about general topics (weather, news, cooking, etc.), politely refuse and redirect to L'Oréal beauty topics
- When users ask about competitor products, suggest L'Oréal alternatives instead
- Stay within your expertise as a L'Oréal beauty consultant

RESPONSE TEMPLATES FOR OFF-TOPIC QUESTIONS:
- For competitor brands: "I'm a L'Oréal beauty specialist, so I focus exclusively on L'Oréal products. However, I'd be happy to recommend a similar L'Oréal product that might meet your needs!"
- For non-beauty topics: "I'm here specifically to help with L'Oréal beauty and skincare questions. Is there anything about L'Oréal products or beauty routines I can assist you with today?"
- For general beauty advice: "I'd love to help with that using L'Oréal products! Let me recommend some L'Oréal solutions..."

PERSONALIZATION GUIDELINES:
- When a user shares their name, acknowledge it and use it occasionally (not excessively)
- Remember skin concerns, product preferences, and beauty goals mentioned in the conversation
- Reference past recommendations: "As I mentioned earlier..." or "Building on what we discussed..."
- Ask follow-up questions about previous recommendations
- Tailor new suggestions based on their established preferences

Always be polite, professional, and enthusiastic about L'Oréal products while firmly staying within your role boundaries.`;

// Store conversation history and user context for personalized interactions
let conversationHistory = [{ role: "system", content: SYSTEM_PROMPT }];

// User context tracking - stores information mentioned during conversation
let userContext = {
  name: null,
  skinType: null,
  skinConcerns: [],
  preferredProducts: [],
  beautyGoals: [],
  previousRecommendations: [],
  conversationTopic: null,
};

// Set initial welcome message that encourages context sharing
chatWindow.innerHTML =
  "<div class=\"msg ai\">👋 Hello! I'm your personal L'Oréal beauty advisor. I'd love to get to know you better so I can provide personalized recommendations. Feel free to share your name and tell me about your skin type or beauty concerns - I'll remember our conversation to give you the best advice possible!</div>";

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user message
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // Clear input field
  userInput.value = "";

  // Show the question immediately and typing indicator
  showQuestionWithTyping(userMessage);

  try {
    // Send request to API with enhanced context
    const response = await sendToOpenAI(userMessage);

    // Replace typing indicator with the actual response
    replaceTypingWithResponse(response);

    // Update user context based on the conversation
    updateUserContext(userMessage, response);
  } catch (error) {
    // Replace typing indicator with error message
    replaceTypingWithResponse(
      "Sorry, I encountered an error. Please try again."
    );
    console.error("API Error:", error);
  }
});

/* Function to display messages in the chat window */
function displayMessage(message, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("msg", sender);
  messageDiv.textContent = message;

  // Add message to chat window
  chatWindow.appendChild(messageDiv);

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Function to show question with typing indicator */
function showQuestionWithTyping(userQuestion) {
  // Display the user's question
  const questionDiv = document.createElement("div");
  questionDiv.classList.add("msg", "user");
  questionDiv.textContent = userQuestion;
  chatWindow.appendChild(questionDiv);

  // Display typing indicator with animated dots
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("msg", "ai");
  typingDiv.id = "typing-indicator";

  // Create animated typing dots
  const dotsContainer = document.createElement("div");
  dotsContainer.style.display = "flex";
  dotsContainer.style.alignItems = "center";
  dotsContainer.style.gap = "4px";

  const typingText = document.createElement("span");
  typingText.textContent = "Thinking";
  dotsContainer.appendChild(typingText);

  // Create animated dots
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.textContent = ".";
    dot.style.animation = `typingDots 1.4s infinite ${i * 0.2}s`;
    dotsContainer.appendChild(dot);
  }

  typingDiv.appendChild(dotsContainer);
  chatWindow.appendChild(typingDiv);

  // Scroll to bottom to show latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Function to replace typing indicator with actual response */
function replaceTypingWithResponse(response) {
  const typingIndicator = document.getElementById("typing-indicator");
  if (typingIndicator) {
    // Replace the typing indicator content with the actual response
    typingIndicator.id = ""; // Remove the typing indicator ID
    typingIndicator.innerHTML = ""; // Clear the typing dots
    typingIndicator.textContent = response; // Add the response text

    // Scroll to bottom to show the response
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

/* Function to display user question and AI response as a pair */
function displayQuestionAndResponse(userQuestion, aiResponse) {
  // Don't clear the chat window - maintain history

  // Display the user's question
  const questionDiv = document.createElement("div");
  questionDiv.classList.add("msg", "user");
  questionDiv.textContent = userQuestion;
  chatWindow.appendChild(questionDiv);

  // Display the AI response
  const responseDiv = document.createElement("div");
  responseDiv.classList.add("msg", "ai");
  responseDiv.textContent = aiResponse;
  chatWindow.appendChild(responseDiv);

  // Scroll to bottom to show latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Function to extract and update user context from conversation */
function updateUserContext(userMessage, aiResponse) {
  // Extract user's name if mentioned
  const namePatterns = [
    /my name is (\w+)/i,
    /i'm (\w+)/i,
    /i am (\w+)/i,
    /call me (\w+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = userMessage.match(pattern);
    if (match && !userContext.name) {
      userContext.name = match[1];
      break;
    }
  }

  // Extract skin type information
  const skinTypeKeywords = {
    oily: ["oily", "greasy", "shiny"],
    dry: ["dry", "flaky", "rough", "tight"],
    combination: ["combination", "mixed", "t-zone"],
    sensitive: ["sensitive", "reactive", "irritated"],
    normal: ["normal", "balanced"],
  };

  for (const [type, keywords] of Object.entries(skinTypeKeywords)) {
    if (
      keywords.some((keyword) => userMessage.toLowerCase().includes(keyword))
    ) {
      if (!userContext.skinType) {
        userContext.skinType = type;
      }
      break;
    }
  }

  // Extract skin concerns
  const concernKeywords = [
    "acne",
    "breakouts",
    "pimples",
    "blackheads",
    "whiteheads",
    "wrinkles",
    "fine lines",
    "aging",
    "anti-aging",
    "dark spots",
    "hyperpigmentation",
    "discoloration",
    "dullness",
    "brightening",
    "glow",
    "pores",
    "large pores",
    "texture",
    "redness",
    "inflammation",
    "irritation",
  ];

  concernKeywords.forEach((concern) => {
    if (
      userMessage.toLowerCase().includes(concern) &&
      !userContext.skinConcerns.includes(concern)
    ) {
      userContext.skinConcerns.push(concern);
    }
  });

  // Extract beauty goals
  const goalKeywords = [
    "clearer skin",
    "glowing skin",
    "even skin tone",
    "younger looking",
    "firmer skin",
    "hydrated skin",
    "matte finish",
    "natural look",
    "bold makeup",
  ];

  goalKeywords.forEach((goal) => {
    if (
      userMessage.toLowerCase().includes(goal) &&
      !userContext.beautyGoals.includes(goal)
    ) {
      userContext.beautyGoals.push(goal);
    }
  });

  // Extract product recommendations from AI response
  const productPatterns = [
    /L'Oréal ([^.,!?\n]+)/gi,
    /Revitalift ([^.,!?\n]+)/gi,
    /Age Perfect ([^.,!?\n]+)/gi,
    /True Match ([^.,!?\n]+)/gi,
  ];

  productPatterns.forEach((pattern) => {
    const matches = aiResponse.match(pattern);
    if (matches) {
      matches.forEach((product) => {
        if (!userContext.previousRecommendations.includes(product)) {
          userContext.previousRecommendations.push(product);
        }
      });
    }
  });

  // Update conversation topic
  const topics = [
    "skincare",
    "makeup",
    "routine",
    "foundation",
    "serum",
    "moisturizer",
  ];
  for (const topic of topics) {
    if (userMessage.toLowerCase().includes(topic)) {
      userContext.conversationTopic = topic;
      break;
    }
  }
}

/* Function to create contextual system message */
function createContextualSystemMessage() {
  let contextInfo = "";

  if (userContext.name) {
    contextInfo += `The user's name is ${userContext.name}. `;
  }

  if (userContext.skinType) {
    contextInfo += `They have ${userContext.skinType} skin. `;
  }

  if (userContext.skinConcerns.length > 0) {
    contextInfo += `Their skin concerns include: ${userContext.skinConcerns.join(
      ", "
    )}. `;
  }

  if (userContext.beautyGoals.length > 0) {
    contextInfo += `Their beauty goals are: ${userContext.beautyGoals.join(
      ", "
    )}. `;
  }

  if (userContext.previousRecommendations.length > 0) {
    contextInfo += `You have previously recommended: ${userContext.previousRecommendations
      .slice(-3)
      .join(", ")}. `;
  }

  if (contextInfo) {
    return `CURRENT USER CONTEXT: ${contextInfo}Use this information to provide personalized responses and reference previous conversations naturally.`;
  }

  return "";
}

/* Function to send request to Cloudflare Worker */
async function sendToOpenAI(userMessage) {
  // Add user message to conversation history
  conversationHistory.push({ role: "user", content: userMessage });

  // Get API configuration from secrets.js
  const config = window.API_CONFIG;

  // Check configuration
  if (config.useCloudflareWorker) {
    // Use Cloudflare Worker (recommended for production)
    if (
      !config.cloudflareWorkerUrl ||
      config.cloudflareWorkerUrl ===
        "https://your-worker-name.your-subdomain.workers.dev"
    ) {
      throw new Error(
        "Please configure your Cloudflare Worker URL in secrets.js"
      );
    }

    return await sendToCloudflareWorker(userMessage, config);
  } else {
    // Use direct OpenAI API (development only)
    if (!config.openaiKey || config.openaiKey === "your-openai-api-key-here") {
      throw new Error("Please configure your OpenAI API key in secrets.js");
    }

    return await sendToOpenAIDirect(userMessage, config);
  }
}

/* Function to send request via Cloudflare Worker */
async function sendToCloudflareWorker(userMessage, config) {
  // Create enhanced conversation history with context
  const contextualSystemMessage = createContextualSystemMessage();
  const enhancedHistory = [...conversationHistory];

  // Add contextual information if available
  if (contextualSystemMessage) {
    enhancedHistory.push({
      role: "system",
      content: contextualSystemMessage,
    });
  }

  // Prepare request body for Cloudflare Worker
  const requestBody = {
    messages: enhancedHistory,
  };

  // Make request to Cloudflare Worker
  const response = await fetch(config.cloudflareWorkerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  // Check if request was successful
  if (!response.ok) {
    throw new Error(`Cloudflare Worker request failed: ${response.status}`);
  }

  // Parse response
  const data = await response.json();
  const aiMessage = data.choices[0].message.content;

  // Add AI response to conversation history
  conversationHistory.push({ role: "assistant", content: aiMessage });

  // Keep conversation history manageable (last 10 exchanges)
  if (conversationHistory.length > 21) {
    conversationHistory = [
      conversationHistory[0], // Keep system prompt
      ...conversationHistory.slice(-20), // Keep last 20 messages
    ];
  }

  return aiMessage;
}

/* Function to send request directly to OpenAI (backup method) */
async function sendToOpenAIDirect(userMessage, config) {
  // Create enhanced conversation history with context
  const contextualSystemMessage = createContextualSystemMessage();
  const enhancedHistory = [...conversationHistory];

  // Add contextual information if available
  if (contextualSystemMessage) {
    enhancedHistory.push({
      role: "system",
      content: contextualSystemMessage,
    });
  }

  // Make request to OpenAI API directly
  const response = await fetch(config.openaiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: enhancedHistory,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  // Check if request was successful
  if (!response.ok) {
    throw new Error(`OpenAI API request failed: ${response.status}`);
  }

  // Parse response
  const data = await response.json();
  const aiMessage = data.choices[0].message.content;

  // Add AI response to conversation history
  conversationHistory.push({ role: "assistant", content: aiMessage });

  // Keep conversation history manageable (last 10 exchanges)
  if (conversationHistory.length > 21) {
    conversationHistory = [
      conversationHistory[0], // Keep system prompt
      ...conversationHistory.slice(-20), // Keep last 20 messages
    ];
  }

  return aiMessage;
}

/* Function to show typing indicator with user question */
function showTypingIndicatorWithQuestion(userQuestion) {
  // Don't clear the chat window - maintain history

  // Display the user's question
  const questionDiv = document.createElement("div");
  questionDiv.classList.add("msg", "user");
  questionDiv.textContent = userQuestion;
  chatWindow.appendChild(questionDiv);

  // Display typing indicator with animated dots
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("msg", "ai");
  typingDiv.id = "typing-indicator";

  // Create animated typing dots
  const dotsContainer = document.createElement("div");
  dotsContainer.style.display = "flex";
  dotsContainer.style.alignItems = "center";
  dotsContainer.style.gap = "4px";

  const typingText = document.createElement("span");
  typingText.textContent = "Thinking";
  dotsContainer.appendChild(typingText);

  // Create animated dots
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.textContent = ".";
    dot.style.animation = `typingDots 1.4s infinite ${i * 0.2}s`;
    dotsContainer.appendChild(dot);
  }

  typingDiv.appendChild(dotsContainer);
  chatWindow.appendChild(typingDiv);

  // Scroll to bottom to show latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Function to show typing indicator (legacy - for compatibility) */
function showTypingIndicator() {
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("msg", "ai");
  typingDiv.id = "typing-indicator";
  typingDiv.textContent = "Thinking...";

  chatWindow.appendChild(typingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Function to hide typing indicator */
function hideTypingIndicator() {
  const typingIndicator = document.getElementById("typing-indicator");
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

/* Debug function to display current user context (for testing) */
function displayUserContext() {
  console.log("Current User Context:", userContext);
  return userContext;
}

// Make debug function available globally for testing
window.displayUserContext = displayUserContext;
