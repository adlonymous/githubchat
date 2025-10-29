export interface ChatHistory {
  id: string;
  repoUrl: string;
  repoName: string;
  messages: Array<{
    id: string;
    text: string;
    isUser: boolean;
    timestamp: string;
  }>;
  lastUpdated: string;
}

const STORAGE_KEY = "githubchat_history";
const MAX_HISTORY_ITEMS = 50;

export function saveChatHistory(repoUrl: string, repoName: string, messages: Array<{ id: string; text: string; isUser: boolean; timestamp: Date }>) {
  try {
    const history = getChatHistory();
    
    // Find existing chat for this repo
    const existingIndex = history.findIndex(h => h.repoUrl === repoUrl);
    
    const chatEntry: ChatHistory = {
      id: existingIndex >= 0 ? history[existingIndex].id : Date.now().toString(),
      repoUrl,
      repoName,
      messages: messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        isUser: msg.isUser,
        timestamp: msg.timestamp.toISOString(),
      })),
      lastUpdated: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      history[existingIndex] = chatEntry;
    } else {
      history.unshift(chatEntry);
    }

    // Keep only the most recent MAX_HISTORY_ITEMS
    const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error("Failed to save chat history:", error);
  }
}

export function getChatHistory(): ChatHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return [];
  }
}

export function getChatHistoryByRepo(repoUrl: string): ChatHistory | null {
  const history = getChatHistory();
  return history.find(h => h.repoUrl === repoUrl) || null;
}

export function deleteChatHistory(chatId: string) {
  try {
    const history = getChatHistory();
    const filtered = history.filter(h => h.id !== chatId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete chat history:", error);
  }
}

export function clearAllChatHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear chat history:", error);
  }
}

