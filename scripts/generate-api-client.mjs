import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultSpecPath = path.join(repositoryRoot, 'openapi', 'openapi.json');
const defaultOutputPath = path.join(
  repositoryRoot,
  'src',
  'shared',
  'api',
  'generated',
  'openapi.ts',
);

function referenceName(reference) {
  return reference.split('/').at(-1) ?? 'unknown';
}

function formatEnum(values) {
  return values.map((value) => JSON.stringify(value)).join(' | ');
}

function formatInlineObject(schema, typeFor) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(properties).map(([name, property]) => {
    const optional = required.has(name) ? '' : '?';
    return `${JSON.stringify(name)}${optional}: ${typeFor(property)};`;
  });

  if (entries.length === 0 && schema.additionalProperties) {
    const valueSchema =
      schema.additionalProperties === true ? {} : schema.additionalProperties;
    return `Record<string, ${typeFor(valueSchema)}>`;
  }

  return `{ ${entries.join(' ')} }`;
}

function createTypeFormatter() {
  const formatter = (schema) => {
    if (!schema) {
      return 'unknown';
    }
    if (schema.$ref) {
      return referenceName(schema.$ref);
    }
    if (schema.enum) {
      return formatEnum(schema.enum);
    }
    if (schema.anyOf || schema.oneOf) {
      const variants = schema.anyOf ?? schema.oneOf;
      return variants.map((variant) => formatter(variant)).join(' | ');
    }
    if (schema.allOf) {
      return schema.allOf.map((variant) => formatter(variant)).join(' & ');
    }
    if (schema.type === 'array') {
      const itemType = formatter(schema.items);
      return itemType.includes(' | ') ? `Array<${itemType}>` : `${itemType}[]`;
    }
    if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
      return formatInlineObject(schema, formatter);
    }

    switch (schema.type) {
      case 'boolean':
        return 'boolean';
      case 'integer':
      case 'number':
        return 'number';
      case 'null':
        return 'null';
      case 'string':
        return 'string';
      default:
        return 'unknown';
    }
  };

  return formatter;
}

function responseType(operation, typeFor) {
  const response = Object.entries(operation.responses ?? {}).find(([status]) =>
    /^2\d\d$/.test(status),
  )?.[1];
  const schema = response?.content?.['application/json']?.schema;
  return typeFor(schema);
}

function requestType(operation, typeFor) {
  const schema = operation.requestBody?.content?.['application/json']?.schema;
  return schema ? typeFor(schema) : 'undefined';
}

export function generateClientDocument(spec) {
  const typeFor = createTypeFormatter();
  const schemas = spec.components?.schemas ?? {};
  const lines = [
    '// 此文件由 scripts/generate-api-client.mjs 生成，请勿手动修改。',
    '',
  ];

  for (const name of Object.keys(schemas).sort()) {
    const schema = schemas[name];
    if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
      const properties = schema.properties ?? {};
      const required = new Set(schema.required ?? []);
      lines.push(`export interface ${name} {`);
      for (const [propertyName, property] of Object.entries(properties)) {
        const optional = required.has(propertyName) ? '' : '?';
        lines.push(`  ${propertyName}${optional}: ${typeFor(property)};`);
      }
      if (Object.keys(properties).length === 0 && schema.additionalProperties) {
        lines.push(
          `  [key: string]: ${typeFor(schema.additionalProperties === true ? {} : schema.additionalProperties)};`,
        );
      }
      lines.push('}', '');
      continue;
    }

    lines.push(`export type ${name} = ${typeFor(schema)};`, '');
  }

  lines.push('export interface ApiPathMap {');
  for (const pathName of Object.keys(spec.paths ?? {}).sort()) {
    lines.push(`  ${JSON.stringify(pathName)}: {`);
    const pathItem = spec.paths[pathName];
    for (const method of Object.keys(pathItem)
      .filter((key) => ['get', 'post', 'put', 'patch', 'delete'].includes(key))
      .sort()) {
      const operation = pathItem[method];
      lines.push(`    ${method}: {`);
      lines.push(`      request: ${requestType(operation, typeFor)};`);
      lines.push(`      response: ${responseType(operation, typeFor)};`);
      lines.push('    };');
    }
    lines.push('  };');
  }
  lines.push('}', '');

  return `${lines.join('\n')}\n`;
}

export async function generateClient({
  specPath = defaultSpecPath,
  outputPath = defaultOutputPath,
} = {}) {
  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  const document = generateClientDocument(spec);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, document);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  generateClient()
    .then(() =>
      console.log(`已生成 ${path.relative(repositoryRoot, defaultOutputPath)}`),
    )
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
