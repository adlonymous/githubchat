import type { CodeChunk } from "./chunking";

export interface RetrievalResult {
	chunk: CodeChunk;
	score: number;
}

/**
 * Retrieve top-K similar code chunks from Vectorize
 */
export async function retrieveSimilarChunks(
	queryEmbedding: number[],
	vectorize: VectorizeIndex,
	repoId: string,
	topK: number = 5
): Promise<RetrievalResult[]> {
	try {
		// Vectorize query - search for similar vectors
		const matches = await vectorize.query(queryEmbedding, {
			topK,
			returnMetadata: true,
		});

		// Filter by repoId in post-processing since Vectorize filters may not support nested objects
		const filteredMatches = matches.matches.filter((match) => {
			const metadata = match.metadata as { repoId?: string };
			return metadata?.repoId === repoId;
		});

		return filteredMatches.map((match) => ({
			chunk: match.metadata as unknown as CodeChunk,
			score: match.score || 0,
		}));
	} catch (error) {
		console.error("Retrieval error:", error);
		// Return empty array on error
		return [];
	}
}

/**
 * Format retrieved chunks as context for the AI model
 */
export function formatChunksAsContext(chunks: RetrievalResult[]): string {
	if (chunks.length === 0) {
		return "";
	}

	const contextParts = chunks.map((result, index) => {
		const { chunk } = result;
		return `[Code Snippet ${index + 1}]
File: ${chunk.filePath}
Lines: ${chunk.startLine}-${chunk.endLine}
${chunk.content}`;
	});

	return `\n\n## Relevant Code Context:\n${contextParts.join("\n\n---\n\n")}`;
}

