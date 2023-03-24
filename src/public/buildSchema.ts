import { schema } from './schema';
import { printSubgraphSchema } from '@apollo/subgraph';
import path from 'path';
import fs from 'fs';

const sdl = printSubgraphSchema(schema);

const generatedSchemaDirectory = './generated/';

if (!fs.existsSync(generatedSchemaDirectory)) {
  fs.mkdirSync(generatedSchemaDirectory);
}

const filePath = path.resolve(
  __dirname,
  '../..',
  generatedSchemaDirectory + 'schema-public.graphql'
);

fs.writeFileSync(filePath, sdl);
