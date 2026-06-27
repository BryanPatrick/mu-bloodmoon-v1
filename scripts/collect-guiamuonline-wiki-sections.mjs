import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_ORIGIN = 'https://www.guiamuonline.com';
const REFERENCE_ROOT = 'references/game-assets/guiamuonline/wiki-sections';
const PUBLIC_ROOT = 'apps/web/public/images/game-assets/guiamuonline/wiki-sections/original';
const DATA_FILE = 'references/game-data/guiamuonline-wiki-sections-data.json';
const REFERENCE_FILE = 'references/game-data/guiamuonline-wiki-sections-reference.md';

const sections = [
  {
    key: 'drops',
    title: 'Drops por mapa e monstro',
    seeds: ['/lorencia-drop-normal'],
    include: [/drop-normal/i],
    exclude: [/\.css$/i, /\.js$/i],
    maxPages: 80,
  },
  {
    key: 'skills',
    title: 'Skills por personagem e fonte',
    seeds: ['/dark-knight-skill', '/skills-mu-online'],
    include: [/skill/i, /^\/skills-mu-online/i, /^\/personajes\/.+\/master-skill-tree/i],
    exclude: [/skillenhanced/i],
    maxPages: 90,
  },
  {
    key: 'maps',
    title: 'Mapas e cidades',
    seeds: ['/lorencia-mapa'],
    include: [/-mapa$/i, /\/mapas/i, /mapa/i],
    exclude: [/google/i],
    maxPages: 80,
  },
  {
    key: 'spots',
    title: 'Spots de up',
    seeds: ['/spot/spot.html'],
    include: [/^\/spot\//i, /spot/i],
    exclude: [],
    maxPages: 40,
  },
  {
    key: 'events',
    title: 'Eventos',
    seeds: ['/eventos-mu-online'],
    include: [/eventos-mu-online/i, /evento/i, /invasion/i, /invas/i, /castle/i, /blood-castle/i, /devil-square/i, /chaos-castle/i, /crywolf/i],
    exclude: [],
    maxPages: 120,
  },
  {
    key: 'quests',
    title: 'Quests',
    seeds: ['/quest-mu-online'],
    include: [/quest-mu-online/i, /quest/i, /blood-castle/i, /devil-square/i, /chaos-castle/i, /illusion-temple/i],
    exclude: [],
    maxPages: 120,
  },
  {
    key: 'npcs',
    title: 'NPCs',
    seeds: ['/npc'],
    include: [/^\/npc/i, /npc/i],
    exclude: [],
    maxPages: 80,
  },
  {
    key: 'tutorials',
    title: 'Como jogar e primeiros passos',
    seeds: ['/como-jugar'],
    include: [/como-jugar/i, /comandos/i, /teclas/i, /guias/i],
    exclude: [],
    maxPages: 80,
  },
];

const decodeHtml = (value = '') =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ');

const stripTags = (value = '') =>
  decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );

const slugify = (value = '') =>
  stripTags(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'sem-titulo';

const shortHash = (value = '') => createHash('sha1').update(value).digest('hex').slice(0, 10);

const absoluteUrl = (baseUrl, resource) => new URL(decodeHtml(resource).replace(/\\/g, '/'), baseUrl).href;

const isSameSite = (url) => {
  try {
    return new URL(url).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
};

const pathKey = (url) => {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`.replace(/\/$/, '') || '/';
};

const sectionAcceptsUrl = (section, url) => {
  if (!isSameSite(url)) return false;
  const key = pathKey(url);
  if (section.exclude.some((pattern) => pattern.test(key))) return false;
  return section.include.some((pattern) => pattern.test(key));
};

const fetchBuffer = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 BloodMoonReferenceCollector/1.0',
      Referer: SITE_ORIGIN,
    },
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`${url} => ${response.status} ${response.statusText}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || '',
  };
};

const fetchText = async (url) => {
  const { buffer, contentType } = await fetchBuffer(url);
  const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.toLowerCase();

  if (charset && charset !== 'utf-8' && charset !== 'utf8') {
    return new TextDecoder(charset).decode(buffer);
  }

  const text = buffer.toString('utf8');
  return text.includes('�') ? new TextDecoder('iso-8859-1').decode(buffer) : text;
};

const extensionFor = (url, contentType = '') => {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  if (ext) return ext.split('?')[0];
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('gif')) return '.gif';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('svg')) return '.svg';
  return '.jpg';
};

const extractLinks = (html, baseUrl) => {
  const links = new Set();
  for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = match[1];
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      continue;
    }

    try {
      links.add(absoluteUrl(baseUrl, href).split('#')[0]);
    } catch {
      // Ignore malformed links.
    }
  }

  return [...links];
};

const extractImages = (html, baseUrl) => {
  const images = new Set();

  for (const match of html.matchAll(/<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    try {
      images.add(absoluteUrl(baseUrl, match[1]));
    } catch {
      // Ignore malformed images.
    }
  }

  for (const match of html.matchAll(/url\(([^)]+)\)/gi)) {
    const raw = match[1].replace(/^['"]|['"]$/g, '').trim();
    if (!raw || raw.startsWith('data:')) continue;

    try {
      images.add(absoluteUrl(baseUrl, raw));
    } catch {
      // Ignore malformed backgrounds.
    }
  }

  return [...images].filter((url) => {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(pathname);
  });
};

const extractTitle = (html, fallback) => {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return stripTags(h1 || h2 || title || fallback);
};

const extractTables = (html) => {
  const tables = [];
  for (const tableMatch of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const tableHtml = tableMatch[0];
    const rows = [];
    for (const rowMatch of tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      const rowHtml = rowMatch[0];
      const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map((cell) => stripTags(cell[1]))
        .filter(Boolean);
      if (cells.length) rows.push(cells);
    }

    if (rows.length) tables.push({ rows });
  }

  return tables;
};

const writeJson = (file, data) => writeFile(file, `${JSON.stringify(data, null, 2)}\n`);

const downloadImage = async (sectionKey, pageSlug, imageUrl) => {
  const { buffer, contentType } = await fetchBuffer(imageUrl);
  const sha1 = createHash('sha1').update(buffer).digest('hex');
  const ext = extensionFor(imageUrl, contentType);
  const imageSlug = slugify(path.basename(new URL(imageUrl).pathname, ext));
  const filename = `${imageSlug || 'image'}-${sha1.slice(0, 12)}${ext}`;
  const referenceDir = path.join(REFERENCE_ROOT, sectionKey, 'images');
  const publicDir = path.join(PUBLIC_ROOT, sectionKey);

  await mkdir(referenceDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(referenceDir, filename), buffer);
  await writeFile(path.join(publicDir, filename), buffer);

  return {
    sourceUrl: imageUrl,
    filename,
    referencePath: path.join(referenceDir, filename).replaceAll('\\', '/'),
    publicPath: `/images/game-assets/guiamuonline/wiki-sections/original/${sectionKey}/${filename}`,
    size: buffer.length,
    sha1,
    contentType,
  };
};

const collectSection = async (section) => {
  const queue = section.seeds.map((seed) => absoluteUrl(SITE_ORIGIN, seed));
  const queued = new Set(queue.map(pathKey));
  const visited = new Set();
  const pages = [];
  const errors = [];

  await mkdir(path.join(REFERENCE_ROOT, section.key, 'html'), { recursive: true });
  await mkdir(path.join(REFERENCE_ROOT, section.key, 'text'), { recursive: true });

  for (let index = 0; index < queue.length && pages.length < section.maxPages; index += 1) {
    const url = queue[index];
    const key = pathKey(url);
    if (visited.has(key)) continue;
    visited.add(key);

    try {
      const html = await fetchText(url);
      const title = extractTitle(html, key);
      const pageSlug = `${slugify(title || key)}-${shortHash(key)}`;
      const text = stripTags(html);
      const tables = extractTables(html);
      const links = extractLinks(html, url);
      const imageUrls = extractImages(html, url);
      const images = [];

      await writeFile(path.join(REFERENCE_ROOT, section.key, 'html', `${pageSlug}.html`), html);
      await writeFile(path.join(REFERENCE_ROOT, section.key, 'text', `${pageSlug}.txt`), `${title}\n${url}\n\n${text}\n`);

      for (const imageUrl of imageUrls) {
        try {
          images.push(await downloadImage(section.key, pageSlug, imageUrl));
        } catch (error) {
          errors.push({ section: section.key, pageUrl: url, imageUrl, error: error.message });
        }
      }

      for (const link of links) {
        const linkKey = pathKey(link);
        if (!queued.has(linkKey) && sectionAcceptsUrl(section, link) && queue.length < section.maxPages * 4) {
          queue.push(link);
          queued.add(linkKey);
        }
      }

      pages.push({
        key: pageSlug,
        title,
        sourceUrl: url,
        localHtmlPath: path.join(REFERENCE_ROOT, section.key, 'html', `${pageSlug}.html`).replaceAll('\\', '/'),
        localTextPath: path.join(REFERENCE_ROOT, section.key, 'text', `${pageSlug}.txt`).replaceAll('\\', '/'),
        imageCount: images.length,
        images,
        tableCount: tables.length,
        tables,
        discoveredLinks: links.filter((link) => sectionAcceptsUrl(section, link)),
      });

      console.log(`[${section.key}] ${pages.length}/${section.maxPages} ${title} (${images.length} imagens)`);
    } catch (error) {
      errors.push({ section: section.key, pageUrl: url, error: error.message });
      console.warn(`[${section.key}] erro em ${url}: ${error.message}`);
    }
  }

  return {
    key: section.key,
    title: section.title,
    seedUrls: section.seeds.map((seed) => absoluteUrl(SITE_ORIGIN, seed)),
    pages,
    errors,
    summary: {
      pages: pages.length,
      images: pages.reduce((sum, page) => sum + page.images.length, 0),
      tables: pages.reduce((sum, page) => sum + page.tables.length, 0),
      errors: errors.length,
    },
  };
};

await rm(REFERENCE_ROOT, { recursive: true, force: true });
await rm(PUBLIC_ROOT, { recursive: true, force: true });
await mkdir(REFERENCE_ROOT, { recursive: true });
await mkdir(path.dirname(DATA_FILE), { recursive: true });
await mkdir(PUBLIC_ROOT, { recursive: true });

const collectedAt = new Date().toISOString();
const sectionResults = [];

for (const section of sections) {
  sectionResults.push(await collectSection(section));
}

const result = {
  collectedAt,
  source: SITE_ORIGIN,
  policy: {
    images: 'Arquivos baixados como referencia interna/original. Nao remover marca dagua nem publicar direto; remasterizar ou gerar asset proprio antes de uso publico.',
  },
  sections: sectionResults,
  summary: sectionResults.reduce(
    (total, section) => ({
      pages: total.pages + section.summary.pages,
      images: total.images + section.summary.images,
      tables: total.tables + section.summary.tables,
      errors: total.errors + section.summary.errors,
    }),
    { pages: 0, images: 0, tables: 0, errors: 0 },
  ),
};

await writeJson(path.join(REFERENCE_ROOT, 'manifest.json'), result);
await writeJson(DATA_FILE, result);
await writeFile(
  REFERENCE_FILE,
  [
    '# Guia MU Online - Wiki sections',
    '',
    `Coleta executada em: ${collectedAt}`,
    '',
    '## Politica de uso',
    '',
    '- Imagens baixadas como referencia local/original.',
    '- Nao remover marca dagua nem publicar direto.',
    '- Para publicar, remasterizar/gerar asset proprio mantendo fidelidade ao jogo.',
    '',
    '## Resumo',
    '',
    `- Paginas: ${result.summary.pages}`,
    `- Imagens: ${result.summary.images}`,
    `- Tabelas: ${result.summary.tables}`,
    `- Erros: ${result.summary.errors}`,
    '',
    '## Secoes',
    '',
    ...sectionResults.flatMap((section) => [
      `### ${section.title}`,
      '',
      `- Chave: \`${section.key}\``,
      `- Paginas: ${section.summary.pages}`,
      `- Imagens: ${section.summary.images}`,
      `- Tabelas: ${section.summary.tables}`,
      `- Erros: ${section.summary.errors}`,
      '',
    ]),
  ].join('\n'),
);

console.log(JSON.stringify(result.summary, null, 2));
