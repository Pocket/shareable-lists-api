import path from 'path';
import fs from 'fs';
import { gql } from 'graphql-tag';

export const typeDefsPublic = gql(
  fs
    .readFileSync(path.join(__dirname, '..', 'schema-public.graphql'))
    .toString()
);

export const typeDefsAdmin = gql(
  fs.readFileSync(path.join(__dirname, '..', 'schema-admin.graphql')).toString()
);
