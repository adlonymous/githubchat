import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { FloatingElements } from "../components/FloatingElements";
import { getChatHistory, deleteChatHistory, clearAllChatHistory, type ChatHistory } from "../utils/chatHistory";

export function meta() {
	return [
		{ title: "Chat History - GitHub Repository Analyzer" },
		{ name: "description", content: "View your previous repository analysis chats" },
	];
}

export default function History() {
	const navigate = useNavigate();
	const [history, setHistory] = useState<ChatHistory[]>([]);

	useEffect(() => {
		setHistory(getChatHistory());
	}, []);

	const handleDelete = (chatId: string) => {
		deleteChatHistory(chatId);
		setHistory(getChatHistory());
	};

	const handleClearAll = () => {
		if (confirm("Are you sure you want to delete all chat history?")) {
			clearAllChatHistory();
			setHistory([]);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	const handleChatClick = (repoUrl: string) => {
		const encodedUrl = encodeURIComponent(repoUrl);
		navigate(`/chat/${encodedUrl}`);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex flex-col relative overflow-hidden">
			{/* Animated Background */}
			<AnimatedBackground />
			
			{/* Floating Elements */}
			<FloatingElements />
			
			{/* Header */}
			<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 relative z-10">
				<div className="max-w-6xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
								Chat History
							</h1>
							<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
								View and resume your previous repository analysis chats
							</p>
						</div>
						<div className="flex gap-3">
							{history.length > 0 && (
								<button
									onClick={handleClearAll}
									className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
								>
									Clear All
								</button>
							)}
							<Link
								to="/"
								className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
							>
								✨ New Repository
							</Link>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 max-w-6xl mx-auto w-full p-4 relative z-10">
				{history.length === 0 ? (
					<div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12 text-center animate-fade-in-scale">
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
							No Chat History
						</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-8">
							You haven't started any repository analysis chats yet.
						</p>
						<Link
							to="/"
							className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
						>
							Start Analyzing a Repository
						</Link>
					</div>
				) : (
					<div className="space-y-4">
						{history.map((chat) => (
							<div
								key={chat.id}
								className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300 animate-fade-in-scale cursor-pointer"
								onClick={() => handleChatClick(chat.repoUrl)}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
											{chat.repoName}
										</h3>
										<p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
											{chat.messages[chat.messages.length - 1]?.text || "No messages"}
										</p>
										<div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
											<span>{chat.messages.length} message{chat.messages.length !== 1 ? "s" : ""}</span>
											<span>•</span>
											<span>Last updated: {formatDate(chat.lastUpdated)}</span>
										</div>
									</div>
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleDelete(chat.id);
										}}
										className="ml-4 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-300 hover:scale-105"
									>
										Delete
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 py-4 relative z-10">
				<div className="max-w-6xl mx-auto px-4 text-center">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						GitHub Repository Analyzer © 2025
					</p>
				</div>
			</div>
		</div>
	);
}

