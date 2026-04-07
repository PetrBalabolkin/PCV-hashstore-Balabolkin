import * as net from 'net';
import * as fs from 'fs/promises';
import * as path from 'path';

export class HashStoreClient {
	private host: string = 'localhost';
	private port: number = 9000;

	async connect(payload: Buffer): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const socket = net.createConnection(this.port, this.host);
			let chunks: Buffer[] = [];

			socket.on('connect', () => {
				socket.write(payload);
			})
			socket.on('data', (d) => {
				chunks.push(d);
			})
			socket.on('end', () => {
				resolve(Buffer.concat(chunks));
			})
			socket.on('error', (err) => {
				reject(err);
			})
		})
	}

	async list() {
		const raw = await this.connect(Buffer.from('LIST'));
		const txt: string = raw.toString();
		const lines: string[] = txt.split('\n');
		const [status, , countStr] = lines[0]?.split(' ');

		if (status !== 200) {
			throw new Error(status);
		}

		const count: number = parseInt(countStr);
		const result = [];

		for (let i = 1; i <= count; i++) {
			const [hash, ...desc] = lines[i]?.split(' ');
			result.push({ hash, description: desc.join(' ') });
		}
		return result;
	}

	async get(hash: string): Promise<void> {
		const raw = await this.connect(Buffer.from(`GET ${hash}\\n`));
		const ind = raw.indexOf('\n');
		const header = raw.slice(0, ind).toString('utf8');
		const parts = header.split(' ');

		if (parts[0] !== '200'){
			throw new Error(header);
		}

		const length = parseInt(parts[2]);
		const desc = parts.slice(3).join('');
		const data = raw.slice(ind + 1, ind + 1 + length);
		const filename = `down_${desc}`;

		await fs.writeFile(path.join(process.cwd(), filename), data);
		console.log(`Saved: ${filename}`);
	}

	async upload(filePath: string, desc: string): Promise<string> {
		const data = await fs.readFile(filePath);
		const header = Buffer.from(`UPLOAD ${data.length} ${desc}\n`);
		const payload = Buffer.concat([header, data]);

		const raw =  await this.connect(payload);

		const response = raw.toString('utf-8').trim();
		const [status, , hash] = response.split(' ');

		if (status == '200') {
			return hash;
		}

		throw new Error(response);
	}

	async delete(hash: string): Promise<void> {
		const raw = await this.connect(Buffer.from(`DELETE ${hash}\n`));
		const response = raw.toString('utf8').trim();
		if (!response.startsWith('200')) {
			throw new Error(response);
		}
	}
}
