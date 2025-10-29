import { useState } from "react";
import { useNavigate } from "react-router";

interface GitHubUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

export function GitHubUrlModal({ isOpen, onClose, onSubmit }: GitHubUrlModalProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validateGitHubUrl = (url: string): boolean => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*)?$/;
    return githubRegex.test(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError("Please enter a GitHub URL");
      return;
    }

    if (!validateGitHubUrl(url)) {
      setError("Please enter a valid GitHub URL (e.g., https://github.com/username/repository)");
      return;
    }

    setError("");
    onSubmit(url);
    setUrl("");
    
    // Navigate to chat page with the repository URL
    const encodedUrl = encodeURIComponent(url);
    navigate(`/chat/${encodedUrl}`);
  };

  const handleClose = () => {
    setUrl("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in-scale"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4 animate-fade-in-scale border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Enter GitHub Repository
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="github-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              GitHub Repository URL
            </label>
            <input
              id="github-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 hover:border-blue-400 hover:shadow-md focus:shadow-lg"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 font-medium hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 animate-shimmer"
            >
              Analyze Repository
            </button>
          </div>
        </form>

        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-2">Examples of valid URLs:</p>
          <ul className="space-y-1 text-xs">
            <li>• https://github.com/microsoft/vscode</li>
            <li>• https://github.com/facebook/react</li>
            <li>• https://github.com/torvalds/linux</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
