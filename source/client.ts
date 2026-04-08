import * as net from 'net';
import * as fs from 'fs/promises';
import * as path from 'path';

export class HashStoreClient {
	private host: string = 'localhost';
	private port: number = 9000;
	private socket: net.Socket | null = null;
	private buffer: Buffer = Buffer.alloc(0);

	async ensureConnected(): Promise<void> {
		if (this.socket && !this.socket.destroyed) return;

		return new Promise((resolve, reject) => {
			const sock = net.createConnection(this.port, this.host);
			sock.once('connect', () => {
				this.socket = sock;
				this.buffer = Buffer.alloc(0);
				sock.on('data', (chunk: Buffer) => {
					this.buffer = Buffer.concat([this.buffer, chunk]);
				});
				resolve();
			});
			sock.once('error', reject);
		});
	}

	private async readLine(): Promise<string> {
		return new Promise((resolve) => {
			const check = () => {
				const idx = this.buffer.indexOf('\n');
				if (idx !== -1) {
					const line = this.buffer.slice(0, idx).toString('utf8');
					this.buffer = this.buffer.slice(idx + 1);
					resolve(line);
				} else {
					setTimeout(check, 10);
				}
			};
			check();
		});
	}

	private async readExact(n: number): Promise<Buffer> {
		return new Promise((resolve) => {
			const check = () => {
				if (this.buffer.length >= n) {
					const data = this.buffer.slice(0, n);
					this.buffer = this.buffer.slice(n);
					resolve(data);
				} else {
					setTimeout(check, 10);
				}
			};
			check();
		});
	}

	private send(data: string | Buffer): void {
		this.socket!.write(data);
	}

	async list(): Promise<{ statusLine: string; files: { hash: string; description: string }[] }> {
		await this.ensureConnected();
		this.send('LIST\n');

		const header = await this.readLine();
		if (!header.startsWith('200')) throw new Error(header);

		const count = parseInt(header.split(' ')[2] ?? '0');
		const files: { hash: string; description: string }[] = [];

		for (let i = 0; i < count; i++) {
			const line = await this.readLine();
			const [hash, ...desc] = line.split(' ');
			if (hash) files.push({ hash, description: desc.join(' ') });
		}

		return { statusLine: header, files };
	}

	async get(hash: string): Promise<{ statusLine: string; filename: string }> {
		await this.ensureConnected();
		this.send(`GET ${hash}\n`);

		const header = await this.readLine();
		if (!header.startsWith('200')) throw new Error(header);

		const parts = header.split(' ');
		const length = parseInt(parts[2] ?? '0');
		const desc = parts.slice(3).join(' ');

		const data = await this.readExact(length);
		const filename = `down_${desc}`;
		await fs.writeFile(path.join(process.cwd(), filename), data);

		return { statusLine: `${parts[0]} ${parts[1]}`, filename };
	}

	async upload(filePath: string, desc: string): Promise<{ statusLine: string; hash: string }> {
		await this.ensureConnected();
		const data = await fs.readFile(filePath);
		this.send(`UPLOAD ${data.length} ${desc}\n`);
		this.send(data);

		const header = await this.readLine();
		const parts = header.split(' ');
		if (parts[0] !== '200') throw new Error(header);

		return { statusLine: `${parts[0]} ${parts[1]}`, hash: parts[2]! };
	}

	async delete(hash: string): Promise<{ statusLine: string }> {
		await this.ensureConnected();
		this.send(`DELETE ${hash}\n`);

		const header = await this.readLine();
		if (!header.startsWith('200')) throw new Error(header);

		return { statusLine: header };
	}

	disconnect(): void {
		this.socket?.destroy();
		this.socket = null;
	}
}
