# Cloud SQL for PostgreSQL plugin for Genkit

## Installing the plugin

```bash
npm i --save @genkit-ai/cloud-sql-pg
```

## Using the plugin

```ts
import { genkit } from 'genkit';
import {
  postgres,
  postgresRetrieverRef,
  postgresIndexerRef,
} from '@genkit-ai/cloud-sql-pg';
import { Document } from 'genkit/retriever';

const ai = genkit({
  plugins: [
    postgres([
      {
        tableName: 'my-documents',
        engine: {
          user: 'postgres',
          password: 'password',
          host: 'localhost',
          database: 'mydb',
          port: 5432
        },
        embedder: textEmbedding004,
      },
    ]),
  ],
});

// To index documents:
export const myDocumentsIndexer = postgresIndexerRef({
  tableName: 'my-documents',
});

// Example of indexing documents with different options
const documents = [
  new Document({
    content: [{ text: 'This is a test document' }],
    metadata: { source: 'test', category: 'example' }
  }),
  new Document({
    content: [{ text: 'Another test document' }],
    metadata: { source: 'test', category: 'example' }
  })
];

// Index with default options
await ai.index({ 
  indexer: myDocumentsIndexer, 
  documents 
});

// Index with custom batch size
await ai.index({ 
  indexer: myDocumentsIndexer, 
  documents,
  options: { batchSize: 10 }
});

// Index with custom ID from metadata
const docWithCustomId = new Document({
  content: [{ text: 'Document with custom ID' }],
  metadata: { 
    source: 'test',
    customId: 'custom-123' // This will be used as the document ID
  }
});
await ai.index({ 
  indexer: myDocumentsIndexer, 
  documents: [docWithCustomId]
});


```

The sources for this package are in the main [Genkit](https://github.com/firebase/genkit) repo. Please file issues and pull requests against that repo.

Usage information and reference details can be found in [Genkit documentation](https://firebase.google.com/docs/genkit).

License: Apache 2.0
