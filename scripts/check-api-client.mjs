import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateClient } from './generate-api-client.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const specPath = path.join(repositoryRoot, 'openapi', 'openapi.json');
const lockPath = path.join(repositoryRoot, 'openapi.lock.json');
const generatedPath = path.join(
  repositoryRoot,
  'src',
  'shared',
  'api',
  'generated',
  'openapi.ts',
);

async function main() {
  const [spec, lock] = await Promise.all([
    fs.readFile(specPath),
    fs.readFile(lockPath, 'utf8').then((value) => JSON.parse(value)),
  ]);
  const actualSha256 = createHash('sha256').update(spec).digest('hex');
  if (actualSha256 !== lock.sha256) {
    throw new Error(
      `OpenAPI artifact 哈希不一致：lock=${lock.sha256} actual=${actualSha256}`,
    );
  }

  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'aster-drive-api-check-'),
  );
  const temporaryGeneratedPath = path.join(temporaryDirectory, 'openapi.ts');
  try {
    await generateClient({ specPath, outputPath: temporaryGeneratedPath });
    const [expected, actual] = await Promise.all([
      fs.readFile(generatedPath),
      fs.readFile(temporaryGeneratedPath),
    ]);
    if (!expected.equals(actual)) {
      throw new Error('生成的 API Client 与仓库文件不一致，请运行 yarn api:generate');
    }
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }

  console.log(`API Client 检查通过：${lock.release_version}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
