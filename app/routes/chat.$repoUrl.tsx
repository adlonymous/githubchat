import { ChatInterface } from "../components/ChatInterface";

export function meta() {
	return [
		{ title: "GitHub Repository Chat - AI Analysis" },
		{ name: "description", content: "Chat with AI about your GitHub repository" },
	];
}

export default function Chat() {
	return <ChatInterface />;
}
