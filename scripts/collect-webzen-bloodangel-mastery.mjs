import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_URL = 'https://muonline.webzen.com/pt/gameinfo/guide/detail/137';
const SOURCE_HTML = 'work/webzen-1st-mastery-armors.html';
const ROOT_DIR = 'references/game-assets/webzen/bloodangel-mastery';
const ORIGINAL_DIR = `${ROOT_DIR}/original`;
const DATA_FILE = 'references/game-data/webzen-bloodangel-mastery-data.json';
const REFERENCE_FILE = 'references/game-data/webzen-bloodangel-mastery-reference.md';

const decodeHtml = (value) =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const stripTags = (value) =>
  decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );

const slugify = (value) =>
  stripTags(value)
    .toLowerCase()
    .replace(/'s\b/g, 's')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const extensionFor = (url, contentType) => {
  const extFromUrl = path.extname(new URL(url).pathname).toLowerCase();
  if (extFromUrl) return extFromUrl;
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  return '.jpg';
};

const cellsFor = (rowHtml) =>
  [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => stripTags(match[1]));

const imageUrlsFor = (rowHtml) =>
  [...rowHtml.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((match) =>
    decodeHtml(match[1]).replace(/^\/\//, 'https://'),
  );

const rowsFor = (tableHtml) => [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);

const tableTitleFor = (tableHtml) => {
  const title = tableHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
  return title ? stripTags(title[1]) : '';
};

const parseStatTable = (tableHtml) => {
  const rows = rowsFor(tableHtml);
  let section = 'base';
  const stats = {};

  for (const row of rows) {
    const cells = cellsFor(row);
    if (cells.length === 0) continue;

    if (cells.length === 1 && !/Classification|Image/i.test(cells[0])) {
      section = cells[0];
      stats[section] ??= [];
      continue;
    }

    if (/^(Classification|Image)$/i.test(cells[0])) continue;
    if (/^Required Stats$/i.test(cells[0])) {
      section = 'Required Stats';
      stats[section] ??= [];
      continue;
    }

    stats[section] ??= [];
    stats[section].push({
      label: cells[0],
      values: cells.slice(1),
    });
  }

  return stats;
};

const parseSetOptions = (tableHtml) => {
  const rows = rowsFor(tableHtml).map(cellsFor).filter((row) => row.length > 0);
  if (rows.length < 2 || !rows[0].some((cell) => /set/i.test(cell))) return null;
  return rows[0].map((label, index) => ({
    label,
    options: (rows[1]?.[index] ?? '').split('\n').filter(Boolean),
  }));
};

const download = async (url, targetBase) => {
  const candidates = [url];
  if (url.startsWith('http://')) candidates.push(url.replace('http://', 'https://'));

  let lastError;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          'User-Agent': 'Mozilla/5.0 BloodMoonReferenceCollector/1.0',
          Referer: SOURCE_URL,
        },
      });

      if (!response.ok) {
        lastError = new Error(`${response.status} ${response.statusText}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const extension = extensionFor(candidate, response.headers.get('content-type'));
      const filename = `${targetBase}${extension}`;
      await writeFile(path.join(ORIGINAL_DIR, filename), buffer);
      return {
        filename,
        size: buffer.length,
        sha1: createHash('sha1').update(buffer).digest('hex'),
        downloadedFrom: candidate,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const loadSourceHtml = async () => {
  try {
    return await readFile(SOURCE_HTML, 'utf8');
  } catch {
    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 BloodMoonReferenceCollector/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }
};

const html = await loadSourceHtml();
await mkdir(ORIGINAL_DIR, { recursive: true });
await mkdir(path.dirname(DATA_FILE), { recursive: true });

const article = html.match(/<div class="fr-view">([\s\S]*?)<\/div>\s*<\/article>/i)?.[1] ?? html;
const intro = stripTags(article.match(/<p class="sum">([\s\S]*?)<\/p>/i)?.[1] ?? '');
const acquisition = [...article.matchAll(/<ul class="s10List1">([\s\S]*?)<\/ul>/gi)]
  .slice(0, 1)
  .flatMap((match) => [...match[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((li) => stripTags(li[1]).replace(/^- /, '')));

const imageEntries = [];
const equipment = [];
const setItems = [];
const featureTables = [];
const allDownloads = [];

const headerImage = article.match(/<h1><img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/i);
if (headerImage) {
  imageEntries.push({
    kind: 'header',
    itemName: decodeHtml(headerImage[2]) || 'Mastery Equipment',
    url: decodeHtml(headerImage[1]).replace(/^\/\//, 'https://'),
  });
}

const tooltipImage = article.match(/Tooltip of set item[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>/i);
if (tooltipImage) {
  imageEntries.push({
    kind: 'feature',
    itemName: 'Bloodangel Set Tooltip Example',
    url: decodeHtml(tooltipImage[1]).replace(/^\/\//, 'https://'),
  });
}

const tableMatches = [...article.matchAll(/<table class="tableGuide">[\s\S]*?<\/table>/gi)];

for (let tableIndex = 0; tableIndex < tableMatches.length; tableIndex += 1) {
  const firstTable = tableMatches[tableIndex][0];
  const beforeTable = article.slice(Math.max(0, tableMatches[tableIndex].index - 500), tableMatches[tableIndex].index);
  const captions = [...beforeTable.matchAll(/<p class="caption">([\s\S]*?)<\/p>/gi)];
  const caption = stripTags(captions.at(-1)?.[1] ?? '');
  const title = tableTitleFor(firstTable);
  const rows = rowsFor(firstTable);
  const classificationRow = rows.find((row) => /^Classification$/i.test(cellsFor(row)[0] ?? ''));
  const imageRow = rows.find((row) => /^Image$/i.test(cellsFor(row)[0] ?? ''));

  if (classificationRow && imageRow && /Bloodangel/i.test(title)) {
    const classifications = cellsFor(classificationRow).slice(1);
    const imageUrls = imageUrlsFor(imageRow);
    const stats = parseStatTable(firstTable);
    const record = {
      title,
      caption: caption.replace(/^<|>$/g, ''),
      stats,
      items: classifications.map((itemName, index) => ({
        itemName,
        slug: slugify(itemName),
        sourceUrl: imageUrls[index],
      })),
    };

    const nextTable = tableMatches[tableIndex + 1]?.[0];
    const setOptions = nextTable ? parseSetOptions(nextTable) : null;
    if (setOptions) record.setOptions = setOptions;

    if (/ Equipment$/i.test(title)) equipment.push(record);
    if (/ Set$/i.test(title)) setItems.push(record);

    for (const item of record.items) {
      imageEntries.push({
        kind: / Equipment$/i.test(title) ? 'equipment' : 'set',
        groupTitle: title,
        classCaption: record.caption,
        itemName: item.itemName,
        slug: item.slug,
        url: item.sourceUrl,
      });
    }
  } else {
    const genericRows = rows.map(cellsFor).filter((row) => row.length > 0);
    if (title && genericRows.length > 0) {
      featureTables.push({
        title,
        rows: genericRows,
      });
    }
  }
}

for (const entry of imageEntries) {
  const baseName =
    entry.kind === 'header'
      ? 'mastery-equipment-header'
      : entry.kind === 'feature'
        ? 'bloodangel-set-tooltip-example'
        : `${entry.kind}-${entry.slug}`;

  const downloaded = await download(entry.url, baseName);
  allDownloads.push({
    ...entry,
    ...downloaded,
    localPath: `${ORIGINAL_DIR}/${downloaded.filename}`.replaceAll('\\', '/'),
  });
}

const generatedAt = new Date().toISOString();
const data = {
  generatedAt,
  source: {
    title: '1st Mastery Armors : Mu Online',
    url: SOURCE_URL,
    publisher: 'Webzen',
    language: 'pt route with English guide content',
  },
  usageNotes: [
    'External Webzen assets are stored as original references and should be reviewed before publication.',
    'Item image files are intentionally duplicated by item name when the Webzen guide reuses the same source image for multiple classes.',
  ],
  intro,
  acquisition,
  equipment,
  setItems,
  featureTables,
  images: allDownloads,
};

await writeFile(`${ROOT_DIR}/manifest.json`, `${JSON.stringify(data, null, 2)}\n`);
await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);

const md = [
  '# Webzen Bloodangel Mastery Armors',
  '',
  `Fonte: ${SOURCE_URL}`,
  `Coletado em: ${generatedAt}`,
  '',
  '> Referencia externa. Revisar compatibilidade com a versao do Blood Moon antes de publicar.',
  '',
  '## Descricao',
  '',
  intro,
  '',
  '## Aquisicao',
  '',
  ...acquisition.map((item) => `- ${item}`),
  '',
  '## Equipamentos',
  '',
  ...equipment.flatMap((group) => [
    `### ${group.title}`,
    '',
    `Classe guia: ${group.caption}`,
    '',
    '| Item | Imagem local | Fonte |',
    '| --- | --- | --- |',
    ...group.items.map((item) => {
      const image = allDownloads.find((entry) => entry.kind === 'equipment' && entry.groupTitle === group.title && entry.slug === item.slug);
      return `| ${item.itemName} | ${image?.localPath ?? ''} | ${item.sourceUrl} |`;
    }),
    '',
  ]),
  '## Sets',
  '',
  ...setItems.flatMap((group) => [
    `### ${group.title}`,
    '',
    '| Item | Imagem local | Fonte |',
    '| --- | --- | --- |',
    ...group.items.map((item) => {
      const image = allDownloads.find((entry) => entry.kind === 'set' && entry.groupTitle === group.title && entry.slug === item.slug);
      return `| ${item.itemName} | ${image?.localPath ?? ''} | ${item.sourceUrl} |`;
    }),
    '',
  ]),
].join('\n');

await writeFile(REFERENCE_FILE, `${md}\n`);

console.log(
  JSON.stringify(
    {
      images: allDownloads.length,
      equipmentGroups: equipment.length,
      setGroups: setItems.length,
      manifest: `${ROOT_DIR}/manifest.json`,
      data: DATA_FILE,
      reference: REFERENCE_FILE,
    },
    null,
    2,
  ),
);
