# Cloud SQL for PostgreSQL plugin

The Cloud SQL for PostgreSQL plugin provides indexer and retriever implementations that use PostgreSQL with the pgvector extension for vector similarity search.

## Installation

```posix-terminal
npm i --save @genkit-ai/cloud-sql-pg
```

## Configuration

To use this plugin, specify it when you initialize Genkit:

```ts
import { genkit } from 'genkit';
import { postgres } from '@genkit-ai/cloud-sql-pg';

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
```

You must specify:
- A table name for storing the documents
- PostgreSQL connection details in the `engine` object
- The embedding model you want to use

## Usage

Import retriever and indexer references like so:

```ts
import { postgresRetrieverRef } from '@genkit-ai/cloud-sql-pg';
import { postgresIndexerRef } from '@genkit-ai/cloud-sql-pg';
```

Then, use these references with `ai.retrieve()` and `ai.index()`:

```ts
// To use the table you configured when you loaded the plugin:
let docs = await ai.retrieve({ retriever: postgresRetrieverRef, query });

// To specify a table:
export const myDocumentsRetriever = postgresRetrieverRef({
  tableName: 'my-documents',
});
docs = await ai.retrieve({ retriever: myDocumentsRetriever, query });
```

```ts
// To use the table you configured when you loaded the plugin:
await ai.index({ indexer: postgresIndexerRef, documents });

// To specify a table:
export const myDocumentsIndexer = postgresIndexerRef({
  tableName: 'my-documents',
});
await ai.index({ indexer: myDocumentsIndexer, documents });

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

See the [Retrieval-augmented generation](../rag.md) page for a general discussion on indexers and retrievers. 