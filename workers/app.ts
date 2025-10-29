import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import type { RepoInfo } from "../app/types/repo";
import { chunkCode, extractTextContent } from "./utils/chunking";
import { generateEmbeddings, embedQuery } from "./utils/embeddings";
import { retrieveSimilarChunks, formatChunksAsContext } from "./utils/retrieval";

const app = new Hono<{ Bindings: { AI: any; KV: KVNamespace; VECTORIZE: VectorizeIndex } }>();

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

		const parsed = parseGitHubUrl(repoUrl);
		if (!parsed) {
			return c.json({ error: "Invalid GitHub URL" }, 400);
		}

		const repoId = `${parsed.owner}/${parsed.repo}`;

		// Check if repository is indexed and retrieve relevant chunks
		const indexStatus = await c.env.KV.get(`index:${repoId}`);
		const isIndexed = indexStatus === "indexed";
		
		let codeContext = "";
		let retrievedChunks: any[] = [];
		
		if (isIndexed) {
			try {
				const queryEmbedding = await embedQuery(message, c.env.AI);
				const firstRetrieval = await retrieveSimilarChunks(
					queryEmbedding,
					c.env.VECTORIZE,
					repoId,
					5
				);
				retrievedChunks = firstRetrieval;
				codeContext = formatChunksAsContext(firstRetrieval);
			} catch (error) {
				console.error("Retrieval error:", error);
			}
		}

		// Create a system prompt that includes repository context
		let systemPrompt = `You are an AI assistant specialized in analyzing GitHub repositories. You help developers understand codebases, answer questions about code structure, dependencies, architecture, and provide insights about the repository.

Current Repository: ${repoUrl}

`;

		if (codeContext) {
			systemPrompt += `IMPORTANT: Code context is available below. Use it to answer questions accurately with specific file paths and line numbers when relevant.

Instructions:
- Use the provided code context to answer questions accurately
- Reference specific files and line numbers from the code context
- If you need more information, say so explicitly - the system will retrieve additional context
- Provide insights about common patterns, best practices, or potential improvements
- Keep responses concise but comprehensive
- Focus on practical, actionable advice`;
		} else if (isIndexed) {
			systemPrompt += `The repository is indexed but no relevant code snippets were found for this query. Answer based on general knowledge about the repository if possible.`;
		} else {
			systemPrompt += `IMPORTANT: The repository code is currently being indexed. You don't have access to the actual source code yet, so you can only provide general information about GitHub repositories or wait until indexing completes.

Instructions:
- Inform the user that the repository is still being indexed
- Suggest they wait a moment for indexing to complete, or ask general questions about the repository
- Once indexing is complete, you'll be able to provide specific code references`;
		}

		const userMessageWithContext = codeContext
			? `${message}\n\n${codeContext}`
			: message;

		// Prepare messages for the AI model
		const messages = [
			{
				role: "system" as const,
				content: systemPrompt,
			},
			...(conversationHistory || []).slice(-8), // Keep last 8 messages for context
			{
				role: "user" as const,
				content: userMessageWithContext,
			},
		];

		// First AI call
		const firstResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
			messages,
			max_tokens: 1000,
			temperature: 0.7,
		});

		let finalResponse = firstResponse.response;

		// Check if AI needs more information and do second retrieval
		const needsMoreContext = /need more|don't have|can't find|not available|missing|insufficient/i.test(firstResponse.response);

		if (needsMoreContext && isIndexed && retrievedChunks.length > 0) {
			try {
				const queryEmbedding = await embedQuery(message, c.env.AI);
				const secondRetrieval = await retrieveSimilarChunks(
					queryEmbedding,
					c.env.VECTORIZE,
					repoId,
					10
				);

				const firstChunkIds = new Set(retrievedChunks.map(c => c.chunk.filePath + c.chunk.startLine));
				const additionalChunks = secondRetrieval.filter(
					r => !firstChunkIds.has(r.chunk.filePath + r.chunk.startLine)
				);

				if (additionalChunks.length > 0) {
					const additionalContext = formatChunksAsContext(additionalChunks);
					
					const secondMessages = [
						...messages,
						{
							role: "assistant" as const,
							content: firstResponse.response,
						},
						{
							role: "user" as const,
							content: `Here is additional code context:\n\n${additionalContext}\n\nPlease provide a more complete answer.`,
						},
					];

					const secondResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
						messages: secondMessages,
						max_tokens: 1500,
						temperature: 0.7,
					});

					finalResponse = secondResponse.response;
				}
			} catch (error) {
				console.error("Second retrieval error:", error);
			}
		}

		return c.json({
			response: finalResponse,
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

// Helper function to recursively fetch repository tree
async function fetchRepositoryTree(
	owner: string,
	repo: string,
	sha: string = "HEAD",
	path: string = ""
): Promise<Array<{ path: string; type: string; sha: string }>> {
	const url = path
		? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${sha}`
		: `https://api.github.com/repos/${owner}/${repo}/contents?ref=${sha}`;

	const response = await fetch(url, {
		headers: {
			"Accept": "application/vnd.github.v3+json",
			"User-Agent": "githubchat-app",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}

	const items: Array<{ path: string; type: string; sha: string; url?: string; size?: number }> = await response.json();
	const result: Array<{ path: string; type: string; sha: string }> = [];

	for (const item of items) {
		if (item.type === "file") {
			// Only process code files
			const codeExtensions = /\.(js|ts|jsx|tsx|py|java|cpp|c|h|go|rs|rb|php|swift|kt|md|json|yaml|yml|xml|html|css|scss|less)$/i;
			if (codeExtensions.test(item.path) && (!item.size || item.size < 100000)) {
				// Skip large files
				result.push({
					path: item.path,
					type: item.type,
					sha: item.sha,
				});
			}
		} else if (item.type === "dir") {
			// Recursively fetch subdirectories
			const subItems = await fetchRepositoryTree(owner, repo, sha, item.path);
			result.push(...subItems);
		}
	}

	return result;
}

// Helper function to fetch file contents
async function fetchFileContent(
	owner: string,
	repo: string,
	path: string,
	sha: string
): Promise<string | null> {
	const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
	const response = await fetch(url, {
		headers: {
			"Accept": "application/vnd.github.v3+json",
			"User-Agent": "githubchat-app",
		},
	});

	if (!response.ok) {
		return null;
	}

	const data = await response.json() as { encoding?: string; content?: string };
	if (data.encoding === "base64" && data.content) {
		try {
			return atob(data.content.replace(/\n/g, ""));
		} catch {
			return null;
		}
	}
	return data.content || null;
}

// Index repository endpoint
app.post("/api/repo/index", async (c) => {
	try {
		const { repoUrl } = await c.req.json();
		
		if (!repoUrl) {
			return c.json({ error: "repoUrl is required" }, 400);
		}

		const parsed = parseGitHubUrl(repoUrl);
		if (!parsed) {
			return c.json({ error: "Invalid GitHub URL" }, 400);
		}

		const { owner, repo } = parsed;
		const repoId = `${owner}/${repo}`;

		// Check if already indexed
		const indexStatus = await c.env.KV.get(`index:${repoId}`);
		if (indexStatus === "indexed") {
			return c.json({ 
				success: true, 
				message: "Repository already indexed",
				repoId 
			});
		}

		// Get default branch
		const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
			headers: {
				"Accept": "application/vnd.github.v3+json",
				"User-Agent": "githubchat-app",
			},
		});

		if (!repoResponse.ok) {
			return c.json({ error: "Repository not found" }, 404);
		}

		const repoData = await repoResponse.json() as { default_branch: string };
		const defaultBranch = repoData.default_branch;

		// Fetch repository tree
		const files = await fetchRepositoryTree(owner, repo, defaultBranch);
		
		// Limit to first 100 files for initial indexing
		const filesToProcess = files.slice(0, 100);
		
		// Process files in batches
		const allChunks = [];
		for (const file of filesToProcess) {
			const content = await fetchFileContent(owner, repo, file.path, file.sha);
			if (content) {
				const textContent = extractTextContent(content, file.path);
				if (textContent) {
					const chunks = chunkCode(textContent, file.path);
					allChunks.push(...chunks);
				}
			}
		}

		// Generate embeddings
		const embeddings = await generateEmbeddings(allChunks, c.env.AI, repoId);

		// Store in Vectorize
		const vectors = embeddings.map((emb) => ({
			id: emb.id,
			values: emb.embedding,
			metadata: {
				...emb.chunk,
				repoId,
			},
		}));

		// Batch upsert into Vectorize
		if (vectors.length > 0) {
			// Vectorize batch upsert - we'll do it in batches of 100
			const batchSize = 100;
			for (let i = 0; i < vectors.length; i += batchSize) {
				const batch = vectors.slice(i, i + batchSize);
				await c.env.VECTORIZE.upsert(batch);
			}
		}

		// Mark as indexed
		await c.env.KV.put(`index:${repoId}`, "indexed");

		return c.json({
			success: true,
			message: "Repository indexed successfully",
			chunksIndexed: embeddings.length,
			filesProcessed: filesToProcess.length,
			repoId,
		});
	} catch (error) {
		console.error("Indexing error:", error);
		return c.json(
			{ 
				error: "Failed to index repository",
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

// Catch-all route for React Router - must be last
app.all("*", async (c) => {
	const requestHandler = createRequestHandler(
		() => import("virtual:react-router/server-build"),
		import.meta.env.MODE,
	);

	return requestHandler(c.req.raw, {
		cloudflare: { env: c.env, ctx: c.executionCtx },
	});
});

export default app;
