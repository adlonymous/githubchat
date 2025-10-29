import type { CodeChunk } from "./chunking";

export interface EmbeddingResult {
	id: string;
	embedding: number[];
	chunk: CodeChunk;
}

/**
 * Generate embedding for text using Workers AI
 */
export async function generateEmbedding(
	text: string,
	ai: any
): Promise<number[]> {
	try {
		const response = await ai.run("@cf/baai/bge-base-en-v1.5", {
			text: [text],
		});

		// Handle different response formats
		if (response && Array.isArray(response.data) && response.data.length > 0) {
			return response.data[0];
		}
		// Alternative format: response might be an array directly
		if (Array.isArray(response) && response.length > 0) {
			return response[0];
		}
		// Check if response has embedding property
		if (response && response.embedding && Array.isArray(response.embedding)) {
			return response.embedding;
		}
		throw new Error("Invalid embedding response format");
	} catch (error) {
		console.error("Embedding generation error:", error);
		throw error;
	}
}

/**
 * Generate embeddings for multiple code chunks
 */
export async function generateEmbeddings(
	chunks: CodeChunk[],
	ai: any,
	repoId: string
): Promise<EmbeddingResult[]> {
	const results: EmbeddingResult[] = [];

	// Process in batches to avoid rate limits
	const batchSize = 10;
	for (let i = 0; i < chunks.length; i += batchSize) {
		const batch = chunks.slice(i, i + batchSize);
		
		const batchPromises = batch.map(async (chunk, index) => {
			// Create a rich text representation for embedding
			const textForEmbedding = `File: ${chunk.filePath}\nLines: ${chunk.startLine}-${chunk.endLine}\n\n${chunk.content}`;
			const id = `${repoId}:${chunk.filePath}:${chunk.startLine}-${chunk.endLine}:${i + index}`;
			
			try {
				const embedding = await generateEmbedding(textForEmbedding, ai);
				return {
					id,
					embedding,
					chunk,
				};
			} catch (error) {
				console.error(`Failed to generate embedding for chunk ${id}:`, error);
				return null;
			}
		});

		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults.filter((r): r is EmbeddingResult => r !== null));
	}

	return results;
}

/**
 * Generate embedding for a query
 */
export async function embedQuery(query: string, ai: any): Promise<number[]> {
	return generateEmbedding(query, ai);
}

