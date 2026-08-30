import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const openapiPath = path.join(repositoryRoot, 'openapi', 'openapi.json');
const lockPath = path.join(repositoryRoot, 'openapi.lock.json');
const defaultRepository = 'Narcissus-Ma/aster-drive-api';

function parseArguments(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) {
      throw new Error(`不支持的位置参数：${argument}`);
    }

    const [name, inlineValue] = argument.split('=', 2);
    const value = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) {
      index += 1;
    }

    if (!value || value.startsWith('--')) {
      throw new Error(`参数 ${name} 缺少值`);
    }
    options[name.slice(2)] = value;
  }

  return options;
}

function releaseArtifactUrl(release) {
  const repository = process.env.API_RELEASE_REPOSITORY ?? defaultRepository;
  const baseUrl =
    process.env.API_RELEASE_BASE_URL ??
    `https://github.com/${repository}/releases/download`;
  return `${baseUrl.replace(/\/$/, '')}/${release}/openapi.json`;
}

async function readArtifact(source) {
  if (source.startsWith('file://')) {
    return fs.readFile(fileURLToPath(new URL(source)));
  }

  if (path.isAbsolute(source) || source.startsWith('./') || source.startsWith('../')) {
    return fs.readFile(path.resolve(process.cwd(), source));
  }

  const response = await fetch(source, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(
      `下载 OpenAPI artifact 失败：HTTP ${response.status} ${response.statusText}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

function validateArtifact(buffer) {
  let document;
  try {
    document = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error('OpenAPI artifact 不是有效 JSON');
  }

  if (
    document.openapi !== '3.1.0' ||
    !document.paths ||
    !document.components?.schemas
  ) {
    throw new Error(
      'OpenAPI artifact 缺少必需的 openapi、paths 或 components.schemas 字段',
    );
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const release = options.release;

  if (!release || !/^api-v\d+\.\d+\.\d+(?:-rc\.\d+)?$/.test(release)) {
    throw new Error('请提供形如 api-v1.0.0 或 api-v1.0.0-rc.1 的 --release 参数');
  }

  const artifactUrl = releaseArtifactUrl(release);
  const source = options.source ?? artifactUrl;
  const artifact = await readArtifact(source);
  validateArtifact(artifact);

  const sha256 = createHash('sha256').update(artifact).digest('hex');
  await fs.mkdir(path.dirname(openapiPath), { recursive: true });
  await fs.writeFile(openapiPath, artifact);
  await fs.writeFile(
    lockPath,
    `${JSON.stringify({ release_version: release, artifact_url: artifactUrl, sha256 }, null, 2)}\n`,
  );

  console.log(`已固定 ${release}：${sha256}`);
  if (options.source) {
    console.log(`本次使用本地 source：${source}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
