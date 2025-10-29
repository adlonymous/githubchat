import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { AnimatedBackground } from "./AnimatedBackground";
import { FloatingElements } from "./FloatingElements";
import type { RepoInfo } from "../types/repo";
import { saveChatHistory, getChatHistoryByRepo } from "../utils/chatHistory";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatInterface() {
  const { repoUrl } = useParams<{ repoUrl: string }>();
  const navigate = useNavigate();
  const decodedRepoUrl = repoUrl ? decodeURIComponent(repoUrl) : "";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRepo, setIsLoadingRepo] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load repo info and chat history on mount
  useEffect(() => {
    if (!decodedRepoUrl) return;

    const loadRepoInfo = async () => {
      try {
        const response = await fetch("/api/repo/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: decodedRepoUrl }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRepoInfo(data.data);
            
            // Trigger indexing in the background (non-blocking)
            fetch("/api/repo/index", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ repoUrl: decodedRepoUrl }),
            }).catch(err => console.error("Indexing failed:", err));
            
            // Try to load existing chat history
            const history = getChatHistoryByRepo(decodedRepoUrl);
            if (history && history.messages.length > 0) {
              setMessages(history.messages.map(msg => ({
                id: msg.id,
                text: msg.text,
                isUser: msg.isUser,
                timestamp: new Date(msg.timestamp),
              })));
            } else {
              // Initialize with welcome message
              setMessages([{
                id: "1",
                text: `Hello! I'm your AI-powered GitHub repository analyzer. I can help you understand codebases, answer questions about code structure, dependencies, architecture patterns, and provide insights about best practices. 

What would you like to know about this repository? You can ask me about:
• Code structure and organization
• Dependencies and technologies used
• Architecture patterns and design decisions
• Potential improvements or optimizations
• Best practices and recommendations

How can I help you analyze this repository?`,
                isUser: false,
                timestamp: new Date(),
              }]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load repo info:", error);
      } finally {
        setIsLoadingRepo(false);
      }
    };

    loadRepoInfo();
  }, [decodedRepoUrl]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (!decodedRepoUrl || messages.length === 0 || isLoadingRepo) return;
    const repoName = repoInfo?.full_name || decodedRepoUrl;
    saveChatHistory(decodedRepoUrl, repoName, messages);
  }, [messages, decodedRepoUrl, repoInfo, isLoadingRepo]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !decodedRepoUrl) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? "user" as const : "assistant" as const,
        content: msg.text,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
            message: currentInput,
            repoUrl: decodedRepoUrl,
            conversationHistory,
          }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || "Failed to get AI response");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error while processing your message: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewRepository = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Floating Elements */}
      <FloatingElements />
      
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                GitHub Repository Analyzer
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Powered by AI • Analyzing: {repoInfo?.full_name || decodedRepoUrl || "Repository"}
                {repoInfo?.description && (
                  <span className="block text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {repoInfo.description}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleNewRepository}
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              ✨ New Repository
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative z-10">
        {/* Messages Area */}
        <div className="flex-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm m-4 rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex flex-col animate-fade-in-scale">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 transition-all duration-300 hover:scale-105 ${
                      message.isUser
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-600/50"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={`text-xs mt-2 ${
                      message.isUser 
                        ? "text-blue-100" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-gray-200/50 dark:border-gray-600/50">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything about this repository..."
                  className="w-full px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 pr-12 backdrop-blur-sm bg-white/50 transition-all duration-300 hover:border-blue-400 hover:shadow-md focus:shadow-lg"
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xs font-bold">G</span>
                  </div>
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xs font-bold">C</span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 py-4 relative z-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            GitHub Repository Analyzer © 2025
          </p>
        </div>
      </div>
    </div>
  );
}
