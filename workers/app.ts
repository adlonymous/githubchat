import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import type { RepoInfo } from "../app/types/repo";

const app = new Hono<{ Bindings: { AI: any; KV: KVNamespace } }>();

// Helper function to extract owner/repo from GitHub URL
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
	try {
		const parsed = new URL(url);
		if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
			return null;
		}
		const parts = parsed.pathname.split("/").filter(Boolean);
		if (parts.length < 2) return null;
		return { owner: parts[0], repo: parts[1] };
	} catch {
		return null;
	}
}

// Helper function to transform GitHub API response to RepoInfo
function transformRepoData(data: any): RepoInfo {
	return {
		id: data.id,
		full_name: data.full_name,
		private: data.private,
		fork: data.fork || false,
		default_branch: data.default_branch,
		size: data.size,
		visibility: data.visibility,
		description: data.description,
		topics: data.topics || [],
		license: data.license,
		pushed_at: data.pushed_at,
		updated_at: data.updated_at,
		url: data.url,
		contents_url: data.contents_url,
		trees_url: data.trees_url,
		commits_url: data.commits_url,
		pulls_url: data.pulls_url,
		compare_url: data.compare_url,
		archive_url: data.archive_url,
	};
}

// Chat API endpoint
app.post("/api/chat", async (c) => {
	try {
		const { message, repoUrl, conversationHistory } = await c.req.json();
		
		if (!message || !repoUrl) {
			return c.json({ error: "Message and repoUrl are required" }, 400);
		}

		// Create a system prompt that includes repository context
		const systemPrompt = `You are an AI assistant specialized in analyzing GitHub repositories. You help developers understand codebases, answer questions about code structure, dependencies, architecture, and provide insights about the repository.

Current Repository: ${repoUrl}

Instructions:
- Be helpful and informative about the repository
- If asked about specific files or code, explain what you would need to analyze them
- Provide insights about common patterns, best practices, or potential improvements
- If you don't have access to the actual repository content, explain what analysis would be possible with repository access
- Keep responses concise but comprehensive
- Focus on practical, actionable advice
- When asked questions not about this repository, give a small response limited to two sentences, and say that you are not an expert in it and that the person should ask somewhere else.`;

		// Prepare messages for the AI model
		const messages = [
			{
				role: "system" as const,
				content: systemPrompt,
			},
			...(conversationHistory || []).slice(-10), // Keep last 10 messages for context
			{
				role: "user" as const,
				content: message,
			},
		];

		// Call Workers AI
		const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
			messages,
			max_tokens: 1000,
			temperature: 0.7,
		});

		return c.json({
			response: response.response,
			success: true,
		});
	} catch (error) {
		console.error("Chat API error:", error);
		return c.json(
			{ 
				error: "Failed to process chat message",
				details: error instanceof Error ? error.message : "Unknown error"
			}, 
			500
		);
	}
});

// Repository info endpoint with KV caching
app.get("/api/repo/:owner/:repo", async (c) => {
	try {
		const { owner, repo } = c.req.param();
		const cacheKey = `repo:${owner}/${repo}`;
		
		// Check KV cache first (1 hour TTL)
		const cached = await c.env.KV.get(cacheKey);
		if (cached) {
			const repoInfo: RepoInfo = JSON.parse(cached);
			return c.json({ success: true, data: repoInfo, cached: true });
		}

		// Fetch from GitHub API
		const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
			headers: {
				"Accept": "application/vnd.github.v3+json",
				"User-Agent": "githubchat-app",
			},
		});

		if (!response.ok) {
			if (response.status === 404) {
				return c.json({ error: "Repository not found" }, 404);
			}
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const data = await response.json();
		const repoInfo = transformRepoData(data);

		// Cache in KV (1 hour = 3600 seconds)
		await c.env.KV.put(cacheKey, JSON.stringify(repoInfo), {
			expirationTtl: 3600,
		});

		return c.json({ success: true, data: repoInfo, cached: false });
	} catch (error) {
		console.error("Repo API error:", error);
		return c.json(
			{ 
				error: "Failed to fetch repository information",
				details: error instanceof Error ? error.message : "Unknown error"
			}, 
			500
		);
	}
});

// Repository info by URL endpoint
app.post("/api/repo/info", async (c) => {
	try {
		const { repoUrl } = await c.req.json();
		
		if (!repoUrl) {
			return c.json({ error: "repoUrl is required" }, 400);
		}

		const parsed = parseGitHubUrl(repoUrl);
		if (!parsed) {
			return c.json({ error: "Invalid GitHub URL" }, 400);
		}

		const cacheKey = `repo:${parsed.owner}/${parsed.repo}`;
		
		// Check KV cache first
		const cached = await c.env.KV.get(cacheKey);
		if (cached) {
			const repoInfo: RepoInfo = JSON.parse(cached);
			return c.json({ success: true, data: repoInfo, cached: true });
		}

		// Fetch from GitHub API
		const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
			headers: {
				"Accept": "application/vnd.github.v3+json",
				"User-Agent": "githubchat-app",
			},
		});

		if (!response.ok) {
			if (response.status === 404) {
				return c.json({ error: "Repository not found" }, 404);
			}
			throw new Error(`GitHub API error: ${response.status}`);
		}

		const data = await response.json();
		const repoInfo = transformRepoData(data);

		// Cache in KV (1 hour = 3600 seconds)
		await c.env.KV.put(cacheKey, JSON.stringify(repoInfo), {
			expirationTtl: 3600,
		});

		return c.json({ success: true, data: repoInfo, cached: false });
	} catch (error) {
		console.error("Repo info API error:", error);
		return c.json(
			{ 
				error: "Failed to process repository URL",
				details: error instanceof Error ? error.message : "Unknown error"
			}, 
			500
		);
	}
});

app.get("*", (c) => {
	const requestHandler = createRequestHandler(
		() => import("virtual:react-router/server-build"),
		import.meta.env.MODE,
	);

	return requestHandler(c.req.raw, {
		cloudflare: { env: c.env, ctx: c.executionCtx },
	});
});

export default app;
