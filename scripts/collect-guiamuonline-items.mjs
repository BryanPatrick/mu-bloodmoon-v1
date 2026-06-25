import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_ORIGIN = 'https://www.guiamuonline.com';
const START_URL = `${SITE_ORIGIN}/items-weapons`;
const ROOT_DIR = 'references/game-assets/guiamuonline/items';
const ORIGINAL_DIR = `${ROOT_DIR}/original`;
const HTML_DIR = `${ROOT_DIR}/source-html`;
const MANIFEST_FILE = `${ROOT_DIR}/manifest.json`;
const DATA_FILE = 'references/game-data/guiamuonline-items-data.json';
const REFERENCE_FILE = 'references/game-data/guiamuonline-items-reference.md';

const iconClassMap = {
  W: 'Dark Wizard',
  K: 'Dark Knight',
  E: 'Fairy Elf',
  M: 'Magic Gladiator',
  D: 'Dark Lord',
  S: 'Summoner',
  R: 'Rage Fighter',
  G: 'Grow Lancer',
  L: 'Rune Mage',
  N: 'Slayer',
  U: 'Gun Crusher',
  F: 'White Wizard',
};

const preferredCategoryPaths = [
  '/items-weapons/axe',
  '/items-weapons/mace',
  '/items-weapons/bow',
  '/items-weapons/spear',
  '/items-weapons/sword',
  '/items-weapons/staff',
  '/items-weapons/stick',
  '/items-weapons/scepter',
  '/items-weapons/lance',
  '/items-weapons/rune-mace-items',
  '/items-weapons/short-sword-items',
  '/items-weapons/quiver-items',
  '/items-weapons/claw-items',
  '/items-weapons/magicgun-items',
  '/armor',
  '/pants',
  '/helm',
  '/boots',
  '/gloves',
  '/shield',
  '/set-ancient/set-ancient-normales',
  '/set-ancient/set-lucky',
  '/set-ancient/set-bloodangel-ancient',
  '/set-ancient/set-darkangel-ancient',
  '/set-ancient/set-holyangel-ancient',
  '/set-ancient/set-soul-ancient',
  '/set-ancient/set-blueeye-ancient',
  '/set-ancient/set-silverheart-ancient',
  '/set-ancient/set-manticore-ancient',
  '/set-ancient/set-brilliant-ancient',
  '/set-ancient/set-apocalypse-ancient',
  '/set-ancient/set-primordial-ancient',
  '/wings',
  '/items',
  '/orb-y-scroll',
  '/ring-y-pendant',
  '/jewels',
  '/pentagram',
  '/muun',
  '/earring-items',
];

const fallbackFramePaths = {
  '/items-weapons/axe': '/spanish/items/axe.htm',
  '/items-weapons/mace': '/spanish/items/mace.htm',
  '/items-weapons/bow': '/spanish/items/bow.htm',
  '/items-weapons/spear': '/spanish/items/spear.htm',
  '/items-weapons/sword': '/spanish/items/sword.htm',
  '/items-weapons/staff': '/spanish/items/staff.htm',
  '/items-weapons/stick': '/spanish/items/stick.htm',
  '/items-weapons/scepter': '/spanish/items/scepter.htm',
  '/items-weapons/lance': '/spanish/items/lance.html',
  '/items-weapons/rune-mace-items': '/spanish/items/runemace.html',
  '/items-weapons/short-sword-items': '/spanish/items/shortsword.html',
  '/items-weapons/quiver-items': '/spanish/items/quiver.html',
  '/items-weapons/claw-items': '/spanish/items/glove.html',
  '/items-weapons/magicgun-items': '/spanish/items/gun.html',
  '/armor': '/spanish/items/armor.htm',
  '/pants': '/spanish/items/pants.htm',
  '/helm': '/spanish/items/helm.htm',
  '/boots': '/spanish/items/boots.htm',
  '/gloves': '/spanish/items/gloves.htm',
  '/shield': '/spanish/items/shield.htm',
  '/set-ancient/set-ancient-normales': '/spanish/items/ancientnormal.htm',
  '/set-ancient/set-lucky': '/spanish/items/lucky.html',
  '/set-ancient/set-bloodangel-ancient': '/spanish/items/bloodancient.html',
  '/set-ancient/set-darkangel-ancient': '/spanish/items/darkancient.html',
  '/set-ancient/set-holyangel-ancient': '/spanish/items/holyancient.html',
  '/set-ancient/set-soul-ancient': '/spanish/items/awaancient.html',
  '/set-ancient/set-blueeye-ancient': '/spanish/items/blueyeancient.html',
  '/set-ancient/set-silverheart-ancient': '/spanish/items/silverancient.html',
  '/set-ancient/set-manticore-ancient': '/spanish/items/mantiancient.html',
  '/set-ancient/set-brilliant-ancient': '/spanish/items/brillantancient.html',
  '/set-ancient/set-apocalypse-ancient': '/spanish/items/apocalypseancient.html',
  '/set-ancient/set-primordial-ancient': '/spanish/items/primordialancient.html',
  '/wings': '/spanish/items/wing.htm',
  '/items': '/spanish/items/items.htm',
  '/orb-y-scroll': '/spanish/items/orb.htm',
  '/ring-y-pendant': '/spanish/items/ring.htm',
  '/jewels': '/spanish/items/jewel.htm',
  '/pentagram': '/spanish/items/pentagram.htm',
  '/muun': '/spanish/items/muun.html',
  '/earring-items': '/spanish/items/earring.html',
};

const decodeHtml = (value = '') =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Ntilde;/gi, 'Ñ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&Aacute;/gi, 'Á')
    .replace(/&Eacute;/gi, 'É')
    .replace(/&Iacute;/gi, 'Í')
    .replace(/&Oacute;/gi, 'Ó')
    .replace(/&Uacute;/gi, 'Ú')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const stripTags = (value = '') =>
  decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );

const slugify = (value = '') =>
  stripTags(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const safeFileBase = (value) => slugify(value).slice(0, 120).replace(/-+$/g, '') || 'item';

const absoluteUrl = (baseUrl, resource) => new URL(decodeHtml(resource).replace(/\\/g, '/'), baseUrl).href;

const extensionFor = (url, contentType) => {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  if (ext) return ext;
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('gif')) return '.gif';
  if (contentType?.includes('webp')) return '.webp';
  return '.jpg';
};

const fetchText = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 BloodMoonReferenceCollector/1.0',
      Referer: SITE_ORIGIN,
    },
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.toLowerCase();
  if (charset && charset !== 'utf-8' && charset !== 'utf8') {
    return new TextDecoder(charset).decode(buffer);
  }

  const text = buffer.toString('utf8');
  return text.includes('�') ? new TextDecoder('iso-8859-1').decode(buffer) : text;
};

const downloadBinary = async (url, filenameBase) => {
  const expectedExt = path.extname(new URL(url).pathname).toLowerCase() || '.jpg';
  const expectedFilename = `${safeFileBase(filenameBase)}${expectedExt}`;
  const expectedPath = path.join(ORIGINAL_DIR, expectedFilename);

  try {
    const cached = await readFile(expectedPath);
    return {
      filename: expectedFilename,
      localPath: `${ORIGINAL_DIR}/${expectedFilename}`.replaceAll('\\', '/'),
      size: cached.length,
      sha1: createHash('sha1').update(cached).digest('hex'),
      cached: true,
    };
  } catch {
    // Cache miss; continue with network download.
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 BloodMoonReferenceCollector/1.0',
      Referer: SITE_ORIGIN,
    },
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${safeFileBase(filenameBase)}${extensionFor(url, response.headers.get('content-type'))}`;
  await writeFile(path.join(ORIGINAL_DIR, filename), buffer);

  return {
    filename,
    localPath: `${ORIGINAL_DIR}/${filename}`.replaceAll('\\', '/'),
    size: buffer.length,
    sha1: createHash('sha1').update(buffer).digest('hex'),
  };
};

const lastTagStartBefore = (html, pattern, index) => {
  const matches = [...html.slice(0, index).matchAll(pattern)];
  return matches.at(-1)?.index ?? -1;
};

const firstTagEndAfter = (html, pattern, index) => {
  const match = html.slice(index).match(pattern);
  return match?.index === undefined ? -1 : index + match.index + match[0].length;
};

const rowsFor = (html) => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
const cellsFor = (rowHtml) =>
  [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => ({
    html: match[1],
    text: stripTags(match[1]).replace(/\s+/g, ' ').trim(),
  }));
const imageUrlsFor = (html, baseUrl) =>
  [...html.matchAll(/<img\b[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((match) => absoluteUrl(baseUrl, match[1]));

const isItemImageUrl = (url) => /\/imagenes\/items\//i.test(url) && !/\/(?:char\/icon_|pj\/)/i.test(url);
const isUiImageUrl = (url) => /\/(?:set_|title_bar|line|left|right|mid)\w*\.gif$/i.test(new URL(url).pathname);

const partRowsFor = (html, baseUrl) =>
  [...html.matchAll(/<img\b[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<td\b[^>]*class=["']?table_in["']?[^>]*>([\s\S]*?)<\/td>/gi)]
    .map((match) => ({
      name: stripTags(match[2]).replace(/\s+/g, ' ').trim(),
      imageUrl: absoluteUrl(baseUrl, match[1]),
    }))
    .filter((part) => part.name && isItemImageUrl(part.imageUrl) && !isUiImageUrl(part.imageUrl));

const extractDetailPath = (html) =>
  html.match(/MM_openBrWindow\(['"]([^'"]+)['"]/i)?.[1] ||
  html.match(/window\.open\(['"]([^'"]+)['"]/i)?.[1] ||
  null;

const extractClasses = (html) =>
  [...new Set(
    [...html.matchAll(/icon_([A-Za-z])\.(?:jpg|gif|png|webp)/gi)]
      .map((match) => iconClassMap[match[1].toUpperCase()] || match[1].toUpperCase()),
  )];

const normalizeHeader = (header) => {
  const key = slugify(header);
  const map = {
    imagen: 'image',
    nombre: 'name',
    'normal-drop': 'normalDrop',
    'excellent-drop': 'excellentDrop',
    'velocidad-de-ataque': 'attackSpeed',
    'quienes-lo-pueden-usar': 'usableBy',
    defensa: 'defense',
    'velocidad-de-caminata': 'walkSpeed',
    nivel: 'level',
    durabilidad: 'durability',
    tipo: 'type',
  };

  return map[key] || key || 'value';
};

const listFieldNamesFor = (frameHtml) => {
  const headerText = stripTags(frameHtml).replace(/\s+/g, ' ');
  if (/Velocidad de Ataque/i.test(headerText)) {
    return ['normalDrop', 'excellentDrop', 'attackSpeed'];
  }
  if (/Nivel de Uso/i.test(headerText)) {
    return ['normalDrop', 'excellentDrop', 'requiredLevel'];
  }
  if (/Defensa/i.test(headerText)) {
    return ['defense', 'requiredStrength', 'requiredAgility'];
  }

  return ['value1', 'value2', 'value3', 'value4', 'value5'];
};

const detailTablesFor = (html) =>
  [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((match, tableIndex) => {
    const rows = rowsFor(match[1])
      .map((row) => cellsFor(row).map((cell) => cell.text).filter(Boolean))
      .filter((row) => row.length > 0);

    return {
      index: tableIndex,
      rows,
    };
  }).filter((table) => table.rows.length > 0);

const detailPartsFor = (html, baseUrl) => {
  const titleMatches = [...html.matchAll(/title_bar\.gif[\s\S]*?<td\b[^>]*class=["']?table["']?[^>]*>([\s\S]*?)<\/td>/gi)];

  return titleMatches.map((match, index) => {
    const start = match.index || 0;
    const end = titleMatches[index + 1]?.index ?? html.length;
    const section = html.slice(start, end);
    const imageUrl = imageUrlsFor(section, baseUrl).find((url) => isItemImageUrl(url) && !isUiImageUrl(url)) || null;
    const tables = detailTablesFor(section);

    return {
      name: stripTags(match[1]).replace(/\s+/g, ' ').trim(),
      imageUrl,
      tables,
      levelStats: parseLevelRows(tables),
      rawText: stripTags(section).replace(/\n{2,}/g, '\n'),
    };
  }).filter((part) => part.name);
};

const parseLevelRows = (tables) => {
  const table = tables.find((candidate) => candidate.rows.some((row) => row.some((cell) => /Nivel/i.test(cell))));
  if (!table) return [];

  const dataRows = table.rows.filter((row) => row.length >= 6 && /^\d+$/.test(row[0]));
  return dataRows.map((row) => ({
    itemLevel: Number(row[0]),
    mobItemDrop: row[1] === '~' ? null : Number(row[1]),
    damageMin: row[2] === '~' ? null : Number(row[2]),
    damageMax: row[3] === '~' ? null : Number(row[3]),
    requiredStrength: row[4] === '~' ? null : Number(row[4]),
    requiredAgility: row[5] === '~' ? null : Number(row[5]),
    excellentDamageMin: row[6] === '~' ? null : Number(row[6]),
    excellentDamageMax: row[7] === '~' ? null : Number(row[7]),
    excellentRequiredStrength: row[8] === '~' ? null : Number(row[8]),
    excellentRequiredAgility: row[9] === '~' ? null : Number(row[9]),
    raw: row,
  }));
};

const parseCategoryPage = async (categoryUrl) => {
  const categoryPath = new URL(categoryUrl).pathname;
  const pageHtml = await fetchText(categoryUrl);
  const iframeSrcs = [...pageHtml.matchAll(/<iframe\b[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
  const iframeSrc = iframeSrcs.find((src) => /\/spanish\/items\//i.test(src)) || iframeSrcs.find((src) => /items/i.test(src)) || fallbackFramePaths[categoryPath];
  if (!iframeSrc) {
    return null;
  }

  const title = stripTags(pageHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || path.basename(new URL(categoryUrl).pathname));
  return {
    title,
    pageUrl: categoryUrl,
    frameUrl: absoluteUrl(categoryUrl, iframeSrc),
  };
};

const parseFrameItems = (category, frameHtml) => {
  const detailMatches = [...frameHtml.matchAll(/MM_openBrWindow\(['"]([^'"]+)['"]/gi)]
    .map((match) => ({
      index: match.index,
      0: match[0],
      1: match[1],
      tdStart: lastTagStartBefore(frameHtml, /<td\b/gi, match.index),
    }))
    .filter((match, index, matches) =>
      match.tdStart !== matches[index - 1]?.tdStart || match[1] !== matches[index - 1]?.[1]
    );
  const listFieldNames = listFieldNamesFor(frameHtml);

  return detailMatches.flatMap((match, index) => {
    const detailPath = match[1];
    const nextIndex = detailMatches[index + 1]?.index ?? frameHtml.length;
    const tdStart = lastTagStartBefore(frameHtml, /<td\b/gi, match.index);
    const tdEnd = firstTagEndAfter(frameHtml, /<\/td>/i, match.index);

    if (tdStart === -1 || tdEnd === -1) {
      return [];
    }

    const itemSegmentStart = tdStart;
    const segment = frameHtml.slice(itemSegmentStart, nextIndex);
    const name = stripTags(frameHtml.slice(tdStart, tdEnd)).replace(/\s+/g, ' ').trim();

    if (!name || /Imagen|Nombre|Drop|Quienes/i.test(name)) {
      return [];
    }

    const imageSearchStart = Math.max(0, itemSegmentStart - 1400);
    const imagesBeforeItem = imageUrlsFor(frameHtml.slice(imageSearchStart, itemSegmentStart), category.frameUrl).filter(isItemImageUrl);
    const img = imagesBeforeItem.at(-1);
    const parts = partRowsFor(segment, category.frameUrl);

    const cells = cellsFor(segment)
      .map((cell) => cell.text.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const nameIndex = cells.findIndex((cell) => cell === name);
    const valueCells = cells
      .slice(nameIndex === -1 ? 1 : nameIndex + 1)
      .filter((cell) => !/^Imagen|Nombre|Normal Drop|Excellent|Quienes/i.test(cell));
    const listStats = {};

    valueCells.forEach((value, valueIndex) => {
      if (valueIndex >= listFieldNames.length) {
        return;
      }

      listStats[listFieldNames[valueIndex]] = value;
    });

    return [{
      sourceRow: index,
      name,
      slug: slugify(name),
      category: category.title,
      categorySlug: slugify(category.title),
      source: {
        pageUrl: category.pageUrl,
        frameUrl: category.frameUrl,
        detailUrl: absoluteUrl(category.frameUrl, detailPath),
        imageUrl: img || null,
      },
      listStats,
      usableBy: extractClasses(segment),
      parts,
      rawListText: stripTags(segment),
    }];
  });
};

await mkdir(ORIGINAL_DIR, { recursive: true });
await mkdir(HTML_DIR, { recursive: true });
await mkdir(path.dirname(DATA_FILE), { recursive: true });

const startHtmlFile = path.join(HTML_DIR, 'items-weapons-page.html');
let startHtml;
try {
  startHtml = await fetchText(START_URL);
  await writeFile(startHtmlFile, startHtml);
} catch (error) {
  startHtml = await readFile(startHtmlFile, 'utf8');
}

const menuPaths = [...startHtml.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>\s*<span>([^<]+)<\/span>/gi)]
  .map((match) => ({ path: decodeHtml(match[1]), label: stripTags(match[2]) }))
  .filter((item) => preferredCategoryPaths.includes(item.path));

const categoryPaths = preferredCategoryPaths
  .filter((item, index, list) => list.indexOf(item) === index);

const categories = [];
for (const categoryPath of categoryPaths) {
  const pageUrl = `${SITE_ORIGIN}${categoryPath}`;
  try {
    const parsed = await parseCategoryPage(pageUrl);
    if (parsed) {
      parsed.slug = slugify(parsed.title);
      categories.push(parsed);
    }
  } catch (error) {
    const fallbackFramePath = fallbackFramePaths[categoryPath];
    categories.push({
      title: path.basename(categoryPath),
      slug: slugify(categoryPath),
      pageUrl,
      frameUrl: fallbackFramePath ? `${SITE_ORIGIN}${fallbackFramePath}` : null,
      error: String(error.message || error),
    });
  }
}

const items = [];
const failures = [];

for (const category of categories.filter((item) => item.frameUrl)) {
  try {
    console.error(`[guiamuonline] ${category.title}`);
    const frameHtmlFile = path.join(HTML_DIR, `${safeFileBase(category.slug || slugify(category.title))}.html`);
    let frameHtml;
    try {
      frameHtml = await readFile(frameHtmlFile, 'utf8');
    } catch {
      frameHtml = await fetchText(category.frameUrl);
      await writeFile(frameHtmlFile, frameHtml);
    }
    const categoryItems = parseFrameItems(category, frameHtml);

    for (const item of categoryItems) {
      if (item.source.imageUrl) {
        try {
          const imageBase = `${item.categorySlug}-${item.slug}`;
          item.image = await downloadBinary(item.source.imageUrl, imageBase);
        } catch (error) {
          item.imageError = String(error.message || error);
        }
      } else {
        item.imageError = 'No item image found in source row.';
      }

      if (item.parts?.length) {
        for (const part of item.parts) {
          if (!part.imageUrl) {
            continue;
          }

          try {
            part.slug = slugify(part.name);
            part.image = await downloadBinary(part.imageUrl, `${item.categorySlug}-${item.slug}-${part.slug}`);
          } catch (error) {
            part.imageError = String(error.message || error);
          }
        }
      }

      if (item.source.detailUrl) {
        try {
          const detailHtmlFile = path.join(HTML_DIR, `${safeFileBase(`${item.categorySlug}-${item.slug}-detail`)}.html`);
          let detailHtml;
          try {
            detailHtml = await readFile(detailHtmlFile, 'utf8');
          } catch {
            detailHtml = await fetchText(item.source.detailUrl);
            await writeFile(detailHtmlFile, detailHtml);
          }
          const tables = detailTablesFor(detailHtml);
          item.detail = {
            title: stripTags(detailHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || item.name),
            rawText: stripTags(detailHtml).replace(/\n{2,}/g, '\n'),
            tables,
            levelStats: parseLevelRows(tables),
            parts: detailPartsFor(detailHtml, item.source.detailUrl),
          };

          if (item.detail.parts?.length) {
            for (const part of item.detail.parts) {
              const matchingPart = item.parts?.find((candidate) => slugify(candidate.name) === slugify(part.name));
              part.slug = slugify(part.name);
              if (matchingPart?.image) {
                part.image = matchingPart.image;
                continue;
              }

              if (!part.imageUrl) {
                continue;
              }

              try {
                part.image = await downloadBinary(part.imageUrl, `${item.categorySlug}-${item.slug}-${part.slug}-detail`);
              } catch (error) {
                part.imageError = String(error.message || error);
              }
            }
          }
        } catch (error) {
          item.detailError = String(error.message || error);
        }
      }

      items.push(item);
    }
  } catch (error) {
    failures.push({
      category: category.title,
      frameUrl: category.frameUrl,
      error: String(error.message || error),
    });
  }
}

const generatedAt = new Date().toISOString();
const allParts = items.flatMap((item) => [...(item.parts || []), ...(item.detail?.parts || [])]);
const itemImageFailures = items.filter((item) => (item.imageError || item.detailError) && !item.parts?.length && !item.detail?.parts?.length);
const partImageFailures = allParts.filter((part) => part.imageError);
const data = {
  generatedAt,
  source: {
    name: 'Guia MU Online items',
    url: START_URL,
    language: 'Spanish',
  },
  usageNotes: [
    'External Guia MU Online images are stored as original references and should be reviewed before publication.',
    'Each item is modeled as a reusable object with list stats, usable classes, image metadata and detail tables when available.',
    'Detail tables preserve raw rows because columns vary by item family.',
  ],
  categories,
  failures,
  totals: {
    categories: categories.length,
    categoriesWithFrame: categories.filter((category) => category.frameUrl).length,
    items: items.length,
    images: items.filter((item) => item.image).length,
    partImages: allParts.filter((part) => part.image).length,
    details: items.filter((item) => item.detail).length,
    failures: failures.length + itemImageFailures.length + partImageFailures.length,
    unresolvedItemImages: itemImageFailures.length,
    unresolvedPartImages: partImageFailures.length,
  },
  classIconMap: iconClassMap,
  items,
};

await writeFile(MANIFEST_FILE, `${JSON.stringify(data, null, 2)}\n`);
await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);

const md = [
  '# Guia MU Online - Items reference',
  '',
  `Fonte: ${START_URL}`,
  `Coletado em: ${generatedAt}`,
  '',
  '> Referencia externa. Revisar compatibilidade com a versao do Blood Moon antes de publicar.',
  '',
  '## Resumo',
  '',
  `- Categorias: ${data.totals.categories}`,
  `- Categorias com iframe: ${data.totals.categoriesWithFrame}`,
  `- Itens: ${data.totals.items}`,
  `- Imagens: ${data.totals.images}`,
  `- Imagens de partes de sets: ${data.totals.partImages}`,
  `- Detalhes tecnicos: ${data.totals.details}`,
  `- Falhas registradas: ${data.totals.failures}`,
  '',
  '## Categorias',
  '',
  ...categories.map((category) => `- ${category.title}: ${category.frameUrl || category.error || 'sem iframe'}`),
  '',
  '## Primeiros itens',
  '',
  '| Categoria | Item | Classes | Imagem local | Detalhe |',
  '| --- | --- | --- | --- | --- |',
  ...items.slice(0, 80).map((item) => `| ${item.category} | ${item.name} | ${item.usableBy.join(', ')} | ${item.image?.localPath || item.imageError || ''} | ${item.source.detailUrl || ''} |`),
].join('\n');

await writeFile(REFERENCE_FILE, `${md}\n`);

console.log(JSON.stringify({
  categories: data.totals.categories,
  categoriesWithFrame: data.totals.categoriesWithFrame,
  items: data.totals.items,
  images: data.totals.images,
  details: data.totals.details,
  failures: data.totals.failures,
  manifest: MANIFEST_FILE,
  data: DATA_FILE,
  reference: REFERENCE_FILE,
}, null, 2));
