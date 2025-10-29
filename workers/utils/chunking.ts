export interface CodeChunk {
	content: string;
	filePath: string;
	startLine: number;
	endLine: number;
	metadata?: Record<string, any>;
}

/**
 * Chunk code into smaller, meaningful pieces
 * Tries to preserve function/class boundaries where possible
 */
export function chunkCode(
	content: string,
	filePath: string,
	maxChunkSize: number = 500,
	overlap: number = 50
): CodeChunk[] {
	const chunks: CodeChunk[] = [];
	const lines = content.split("\n");
	const fileExtension = filePath.split(".").pop()?.toLowerCase() || "";

	// Language-specific splitting (basic heuristic)
	const isCode = /\.(js|ts|jsx|tsx|py|java|cpp|c|go|rs|rb|php|swift|kt)$/i.test(filePath);
	
	if (!isCode) {
		// For non-code files, use simple line-based chunking
		let currentChunk: string[] = [];
		let startLine = 0;
		
		for (let i = 0; i < lines.length; i++) {
			currentChunk.push(lines[i]);
			
			if (currentChunk.join("\n").length >= maxChunkSize || i === lines.length - 1) {
				if (currentChunk.length > 0) {
					chunks.push({
						content: currentChunk.join("\n"),
						filePath,
						startLine: startLine + 1,
						endLine: i + 1,
					});
					
					// Overlap: keep last N lines for next chunk
					const overlapLines = currentChunk.slice(-Math.min(overlap / 10, currentChunk.length));
					currentChunk = overlapLines;
					startLine = i - overlapLines.length + 1;
				}
			}
		}
		return chunks;
	}

	// For code files, try to identify function/class boundaries
	let currentChunk: string[] = [];
	let startLine = 0;
	let braceCount = 0;
	let inFunction = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		currentChunk.push(line);

		// Simple heuristic: track braces to identify blocks
		for (const char of line) {
			if (char === "{") braceCount++;
			if (char === "}") braceCount--;
		}

		const currentSize = currentChunk.join("\n").length;
		const isBlockComplete = braceCount === 0 && line.trim().endsWith("}");
		const isEndOfFile = i === lines.length - 1;
		const exceedsSize = currentSize >= maxChunkSize;

		// Create chunk at function/class boundaries or when size limit reached
		if ((isBlockComplete || exceedsSize || isEndOfFile) && currentChunk.length > 0) {
			chunks.push({
				content: currentChunk.join("\n"),
				filePath,
				startLine: startLine + 1,
				endLine: i + 1,
				metadata: {
					language: fileExtension,
				},
			});

			// Overlap: keep last N lines
			const overlapLines = currentChunk.slice(-Math.min(overlap / 10, currentChunk.length));
			currentChunk = overlapLines;
			startLine = i - overlapLines.length + 1;
			braceCount = 0;
		}
	}

	// If there's remaining content, add it
	if (currentChunk.length > 0 && chunks.length === 0 || currentChunk.join("\n").trim().length > 50) {
		chunks.push({
			content: currentChunk.join("\n"),
			filePath,
			startLine: startLine + 1,
			endLine: lines.length,
			metadata: {
				language: fileExtension,
			},
		});
	}

	return chunks;
}

/**
 * Extract text content from a file, handling binary files
 */
export function extractTextContent(content: string, filePath: string): string | null {
	// Check if it's likely a binary file
	const binaryExtensions = /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|woff|woff2|ttf|eot)$/i;
	if (binaryExtensions.test(filePath)) {
		return null;
	}

	// Try to decode base64 if needed
	try {
		// If content looks like base64, decode it
		if (/^[A-Za-z0-9+/]+=*$/.test(content.trim()) && content.length > 100) {
			try {
				return atob(content);
			} catch {
				// Not base64, return as-is
				return content;
			}
		}
		return content;
	} catch {
		return null;
	}
}

