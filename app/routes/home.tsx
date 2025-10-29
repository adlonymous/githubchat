import { useState } from "react";
import { Link } from "react-router";
import { GitHubUrlModal } from "../components/GitHubUrlModal";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { FloatingElements } from "../components/FloatingElements";

export function meta() {
	return [
		{ title: "GitHub Chat - Analyze Repositories" },
		{ name: "description", content: "Analyze GitHub repositories with AI-powered insights" },
	];
}

export function loader({ context }: { context?: any }) {
	return { 
		message: context?.cloudflare?.env?.VALUE_FROM_CLOUDFLARE || "Welcome to GitHub Repository Analyzer" 
	};
}

export default function Home({ loaderData }: { loaderData: any }) {
	const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGitHubUrlSubmit = (url: string) => {
    // URL is handled by the modal component which navigates to chat page
    setIsModalOpen(false);
  };

	const handleModalClose = () => {
		setIsModalOpen(false);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
			{/* Animated Background */}
			<AnimatedBackground />
			
			{/* Floating Elements */}
			<FloatingElements />
			
			{/* Main Content */}
			<div className="text-center relative z-10 animate-slide-in-up">
				<h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					GitHub Repository Analyzer
				</h1>
				<p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
					Paste a GitHub repository URL to get started with AI-powered analysis and insights
				</p>
				
				{!isModalOpen && (
					<div className="flex gap-4 justify-center">
						<button
							onClick={() => setIsModalOpen(true)}
							className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 hover:shadow-blue-500/25 text-lg"
						>
							✨ Analyze New Repository
						</button>
						<Link
							to="/history"
							className="px-8 py-4 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 border border-gray-200 dark:border-gray-700 text-lg"
						>
							📜 View History
						</Link>
					</div>
				)}
			</div>

			<GitHubUrlModal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				onSubmit={handleGitHubUrlSubmit}
			/>
		</div>
	);
}
