import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { HashStoreClient } from './client.js';

const ASCII_ART = [
	' _   _    _    ____  _   _ ____  _____  ___  ____  _____ ',
	'| | | |  / \\  / ___|| | | / ___||_   _|/ _ \\|  _ \\| ____|',
	'| |_| | / _ \\ \\___ \\| |_| \\___ \\  | | | | | | |_) |  _|  ',
	'|  _  |/ ___ \\ ___) |  _  |___) | | | | |_| |  _ <| |___ ',
	'|_| |_/_/   \\_\\____/|_| |_|____/  |_|  \\___/|_| \\_\\_____|',
].join('\n');

type FileEntry = { hash: string; description: string };
type MsgType = 'info' | 'error' | 'cmd' | 'success';
type Message = { text: string; type: MsgType };

const client = new HashStoreClient();

const MSG_COLOR: Record<MsgType, string> = {
	cmd: 'yellow',
	success: 'green',
	error: 'red',
	info: 'white',
};

export default function App() {
	const [files, setFiles] = useState<FileEntry[]>([]);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [messages, setMessages] = useState<Message[]>([
		{ text: 'Type the command and press Enter', type: 'info' },
	]);

	const addMsg = (text: string, type: MsgType = 'info') => {
		setMessages(prev => [...prev.slice(-19), { text, type }]);
	};

	const handleSubmit = async (value: string) => {
		if (isLoading) return;
		const trimmed = value.trim();
		setInput('');
		if (!trimmed) return;

		addMsg(`$ ${trimmed}`, 'cmd');
		const parts = trimmed.split(/\s+/);
		const cmd = parts[0]?.toLowerCase() ?? '';

		setIsLoading(true);
		try {
			if (cmd === 'l' || cmd === 'list') {
				const result = await client.list();
				setFiles(result);
				addMsg(`Found ${result.length} files.`, 'success');
			} else if (cmd === 'g' || cmd === 'get') {
				const hash = parts[1];
				if (!hash) {
					addMsg('Use: get <hash>', 'error');
				} else {
					await client.get(hash);
					addMsg(`Downloaded! Hash: ${hash}`, 'success');
				}
			} else if (cmd === 'u' || cmd === 'upload') {
				const filePath = parts[1];
				if (!filePath) {
					addMsg('Use: upload <cesta> [desc]  (drag & drop)', 'error');
				} else {
					const desc = parts.slice(2).join(' ') || 'no-description';
					const hash = await client.upload(filePath, desc);
					addMsg(`Uploaded! Hash: ${hash}`, 'success');
					const result = await client.list();
					setFiles(result);
				}
			} else if (cmd === 'd' || cmd === 'delete') {
				const hash = parts[1];
				if (!hash) {
					addMsg('Using: delete <hash>', 'error');
				} else {
					await client.delete(hash);
					addMsg(`Deleted: ${hash}`, 'success');
					const result = await client.list();
					setFiles(result);
				}
			} else if (cmd === 'q' || cmd === 'quit' || cmd === 'exit') {
				process.exit(0);
			} else {
				addMsg(
					`Unknown command: "${cmd}". Commands: list | get <hash> | upload <cesta> [desc] | delete <hash> | quit`,
					'error',
				);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			addMsg(`Error: ${msg}`, 'error');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Box flexDirection="column" paddingX={1} paddingY={1}>
			<Box marginBottom={1}>
				<Text color="cyan" bold>
					{ASCII_ART}
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text dimColor>Hash-addressed storage </Text>
				<Text color="yellow">list</Text>
				<Text dimColor>  |  </Text>
				<Text color="yellow">{'get <hash>'}</Text>
				<Text dimColor>  |  </Text>
				<Text color="yellow">{'upload <cesta> [desc]'}</Text>
				<Text dimColor>  |  </Text>
				<Text color="yellow">{'delete <hash>'}</Text>
				<Text dimColor>  |  </Text>
				<Text color="yellow">quit</Text>
			</Box>

			{files.length > 0 && (
				<Box
					flexDirection="column"
					borderStyle="single"
					borderColor="green"
					paddingX={1}
					marginBottom={1}
				>
					<Text bold color="green">
						Files ({files.length}):
					</Text>
					{files.map(f => (
						<Box key={f.hash}>
							<Text color="cyan">{f.hash}</Text>
							<Text dimColor>  —  </Text>
							<Text>{f.description}</Text>
						</Box>
					))}
				</Box>
			)}

			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="gray"
				paddingX={1}
				marginBottom={1}
			>
				{messages.slice(-8).map((msg, i) => (
					<Text key={i} color={MSG_COLOR[msg.type]}>
						{msg.text}
					</Text>
				))}
			</Box>

			<Box
				borderStyle="round"
				borderColor={isLoading ? 'yellow' : 'cyan'}
				paddingX={1}
			>
				<Text color="cyan" bold>
					{isLoading ? '... ' : '>>> '}
				</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder={
						isLoading
							? 'Loading...'
							: 'Enter command... (drag & drop)'
					}
					focus={!isLoading}
				/>
			</Box>
		</Box>
	);
}
