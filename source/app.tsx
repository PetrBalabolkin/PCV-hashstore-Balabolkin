import React, {useEffect, useState} from 'react';
import {Text, useInput} from 'ink';
import { HashStoreClient } from "./client.js";


type Props = {
	name: string | undefined;
};

export default function App({name = 'Stranger'}: Props) {
	const [files, setFiles] = useState<string[]>([]);
	const client = new HashStoreClient();

	useInput(async (input, key) => {
		if (key.escape) {
			process.exit(0);
		}
		if (key.return){

		}
	})

	useEffect(() => {

	}, []);

	return (
		<>
			<Text>HashStore Client</Text>
			<Text>Press L=List, G=Get, U=Upload</Text>
			{files.map(f => <Text key={f}>{f}</Text>)}
		</>
	);
}
