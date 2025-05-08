/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Genkit, z } from 'genkit';
import { GenkitPlugin, genkitPlugin } from 'genkit/plugin';
import { EmbedderArgument, Embedding } from 'genkit/embedder';
import {
  CommonRetrieverOptionsSchema,
  Document,
  indexerRef,
  retrieverRef,
} from 'genkit/retriever';

import { v4 as uuidv4 } from 'uuid';
import { PostgresEngine, Column } from './engine';

const PostgresRetrieverOptionsSchema = CommonRetrieverOptionsSchema.extend({
  k: z.number().max(1000),
  filter: z.record(z.string(), z.any()).optional(),
});

const PostgresIndexerOptionsSchema = z.object({
  batchSize: z.number().default(100),
});

/**
 * postgresRetrieverRef function creates a retriever for Postgres.
 * @param params The params for the new Postgres retriever
 * @param params.tableName The table name for the postgres retriever
If not specified, the default label will be `Postgres - <tableName>`
 * @returns A reference to a Postgres retriever.
 */
export const postgresRetrieverRef = (params: {
  tableName: string;
}) => {
  return retrieverRef({
    name: `postgres/${params.tableName}`,
    info: {
      label: params.tableName ?? `Postgres - ${params.tableName}`,
    },
    configSchema: PostgresRetrieverOptionsSchema,
  });
};

/**
 * postgresIndexerRef function creates an indexer for Postgres.
 * @param params The params for the new Postgres indexer.
 * @param params.tableName The table name for the Postgres indexer.
If not specified, the default label will be `Postgres - <tableName>`
 * @returns A reference to a Postgres indexer.
 */
export const postgresIndexerRef = (params: {
  tableName: string;
}) => {
  return indexerRef({
    name: `postgres/${params.tableName}`,
    info: {
      label: params.tableName ?? `Postgres - ${params.tableName}`,
    },
    configSchema: PostgresIndexerOptionsSchema.optional(),
  });
};

/**
 * Postgres plugin that provides a Postgres retriever and indexer
 * @param params An array of params to set up Postgres retrievers and indexers
 * @param params.tableName The name of the table
 * @param params.embedder The embedder to use for the indexer and retriever
 * @param params.embedderOptions  Options to customize the embedder
 * @returns The Postgres Genkit plugin
 */
export function postgres<EmbedderCustomOptions extends z.ZodTypeAny>(
  params: {
    tableName: string,
    embedder: EmbedderArgument<EmbedderCustomOptions>;
    embedderOptions?: z.infer<EmbedderCustomOptions>;
    engine: PostgresEngine;
    schemaName?: string;
    contentColumn?: string;
    embeddingColumn?: string;
    metadataColumns?: string[];
    ignoreMetadataColumns?: string[];
    idColumn?: string;
    metadataJsonColumn?: string;
    distanceStrategy?: 'cosine' | 'ip' | 'l2';
  }[]
): GenkitPlugin {
  return genkitPlugin('postgres', async (ai: Genkit) => {
    params.map((i) => configurePostgresRetriever(ai, i));
    params.map((i) => configurePostgresIndexer(ai, i));
  });
}

export default postgres;

/**
 * Configures a Postgres retriever.
 * @param ai A Genkit instance
 * @param params The params for the retriever
 * @param params.tableName The name of the table
 * @param params.embedder The embedder to use for the retriever
 * @param params.embedderOptions  Options to customize the embedder
 * @returns A Postgres retriever
 */
export function configurePostgresRetriever<
  EmbedderCustomOptions extends z.ZodTypeAny,
>(
  ai: Genkit,
  params: {
    tableName: string;
    embedder: EmbedderArgument<EmbedderCustomOptions>;
    embedderOptions?: z.infer<EmbedderCustomOptions>;
  }
) {

  return ai.defineRetriever(
    {
      name: `postgres/${params.tableName}`,
      configSchema: PostgresRetrieverOptionsSchema,
    },
    async (content, options) => {
      // Add logic for handling content and options here
      console.log(`Retrieving data for table: ${params.tableName}`);
      return {
        documents: [], // Return appropriate documents based on your logic
      };
    }
  );
}

/**
 * Configures a Postgres indexer.
 * @param ai A Genkit instance
 * @param params The params for the indexer
 * @param params.tableName The name of the indexer
 * @param params.engine The engine to use for the indexer
 * @param params.embedder The embedder to use for the retriever
 * @param params.embedderOptions  Options to customize the embedder
 * @param params.metadataColumns The metadata columns to use for the indexer
 * @param params.idColumn The id column to use for the indexer
 * @param params.metadataJsonColumn The metadata json column to use for the indexer
 * @param params.distanceStrategy The distance strategy to use for the indexer
 * @param params.contentColumn The content column to use for the indexer
 * @param params.embeddingColumn The embedding column to use for the indexer
 * @param params.schemaName The schema name to use for the indexer
 * @param params.chunkSize The chunk size to use for the indexer
 * @returns Add documents to vector store
 */
export function configurePostgresIndexer<
  EmbedderCustomOptions extends z.ZodTypeAny,
>(
  ai: Genkit,
  params: {
    tableName: string;
    engine: PostgresEngine;
    schemaName?: string;
    contentColumn?: string;
    embeddingColumn?: string;
    metadataColumns?: string[];
    ignoreMetadataColumns?: string[];
    idColumn?: string;
    metadataJsonColumn?: string;
    embedder: EmbedderArgument<EmbedderCustomOptions>;
    embedderOptions?: z.infer<EmbedderCustomOptions>;
  }
) {
  if (!params.engine) {
    throw new Error('Engine is required');
  }

  if (params.metadataColumns && params.ignoreMetadataColumns) {
    throw new Error('Cannot use both metadataColumns and ignoreMetadataColumns');
  }

  const {
    tableName,
    engine,
    schemaName,
    contentColumn,
    embeddingColumn,
    metadataColumns,
    ignoreMetadataColumns,
    idColumn,
    metadataJsonColumn,
    embedder,
    embedderOptions
  } = params;

  // Store the final metadata columns at the module level
  let finalMetadataColumns: string[] = metadataColumns || [];

  async function ensureTableExists() {
    // Get existing columns and their types if table exists
    const { rows } = await engine.pool.raw(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = '${tableName}' AND table_schema = '${schemaName || 'public'}'`
    );
    
    if (rows.length === 0) {
      throw new Error(`Table ${schemaName || 'public'}.${tableName} does not exist. Please create it using initVectorstoreTable first.`);
    }

    const existingColumns = rows.map(row => row.column_name);
    const requiredColumns = [
      idColumn || 'id',
      contentColumn || 'content',
      embeddingColumn || 'embedding'
    ];

    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const columnTypes = rows.reduce((acc, row) => {
      acc[row.column_name] = row.data_type;
      return acc;
    }, {} as Record<string, string>);

    // Check content column is text type
    if (columnTypes[contentColumn || 'content'] !== 'text') {
      throw new Error(`Content column must be of type 'text', found '${columnTypes[contentColumn || 'content']}'`);
    }

    // Check embedding column is vector type
    if (columnTypes[embeddingColumn || 'embedding'] !== 'USER-DEFINED') {
      throw new Error(`Embedding column must be of type 'vector', found '${columnTypes[embeddingColumn || 'embedding']}'`);
    }

    // Check id column exists and is a string type
    const idColumnType = columnTypes[idColumn || 'id'];
    if (!idColumnType || !['text', 'character varying', 'varchar', 'uuid'].includes(idColumnType)) {
      throw new Error(`ID column must be a string type (text, varchar, or uuid), found '${idColumnType}'`);
    }

    if (ignoreMetadataColumns && ignoreMetadataColumns.length > 0) {
      finalMetadataColumns = existingColumns.filter(col => 
        !ignoreMetadataColumns.includes(col) && 
        !requiredColumns.includes(col) &&
        col !== metadataJsonColumn
      );
    }
  }

  async function generateEmbeddings(documents: Document[], options?: { batchSize?: number }): Promise<IndexedDocument[]> {
    const CHUNK_SIZE = options?.batchSize || 100;
    const results: IndexedDocument[] = [];
    
    for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
      const chunk = documents.slice(i, i + CHUNK_SIZE);
      try {
        // Single batch call for all documents in the chunk
        const batchEmbeddings = await ai.embedMany({
          embedder,
          content: chunk,
          options: embedderOptions
        });
        
        const chunkResults = chunk.map((doc, index) => ({
          id: doc.metadata?.[idColumn || 'id'] as string || uuidv4(),
          content: typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content),
          embedding: JSON.stringify(batchEmbeddings[index].embedding),
          metadata: doc.metadata || {}
        }));
        
        results.push(...chunkResults);
      } catch (error) {
        throw new Error('Embedding failed');
      }
    }
    
    return results;
  }

  return ai.defineIndexer(
    {
      name: `postgres/${params.tableName}`,
      configSchema: PostgresIndexerOptionsSchema.optional(),
    },
    async (docs, options) => {
      await ensureTableExists();
      
      try {
        const vectors = await generateEmbeddings(docs, options);
        const batchSize = options?.batchSize || 100;

        for (let i = 0; i < vectors.length; i += batchSize) {
          const batch = vectors.slice(i, i + batchSize);
          
          const insertData = batch.map(doc => {
            const metadata = doc.metadata || {};
            return {
              [idColumn || 'id']: doc.id,
              [contentColumn || 'content']: doc.content,
              [embeddingColumn || 'embedding']: doc.embedding,
              ...(metadataJsonColumn && { [metadataJsonColumn]: metadata }),
              ...Object.fromEntries(
                finalMetadataColumns
                  .filter(col => metadata[col] !== undefined)
                  .map(col => [col, metadata[col]])
              )
            };
          });

          const table = schemaName 
            ? engine.pool.withSchema(schemaName).table(tableName)
            : engine.pool.table(tableName);

          await table.insert(insertData);
        }
      } catch (error) {
        throw error;
      }
    }
  );
}

interface IndexedDocument {
  id: string;
  content: string;
  embedding: string;
  metadata: Record<string, unknown>;
}