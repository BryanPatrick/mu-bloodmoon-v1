import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_FILE = 'references/game-data/guiamuonline-items-data.json';
const COMPACT_FILE = 'references/game-data/guiamuonline-items-compact.json';
const ARMOR_COMPACT_FILE = 'apps/web/data/guiamuonlineArmorItems.generated.json';
const ARMOR_CATEGORIES = new Set(['Armor', 'Pants', 'Helm', 'Boots', 'Gloves']);

const normalizeHeader = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const toNumber = (value) => {
  if (value === undefined || value === null || String(value).trim() === '~') {
    return null;
  }

  const number = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : null;
};

const toPublicImagePath = (image) =>
  image?.filename ? `/dev-references/game-assets/guiamuonline/items/original/${image.filename}` : null;

const valueByHeader = (raw, matcher) => {
  const entry = Object.entries(raw).find(([header]) => matcher(normalizeHeader(header)));
  return toNumber(entry?.[1]);
};

const compactLevelStats = (tables = []) => {
  const table = tables.find((candidate) => candidate.rows?.some((row) => row.some((cell) => /^(Nivel|Item Level|Level)$/i.test(cell))));
  const rows = table?.rows || [];
  const headers = rows[0] || [];

  return rows
    .slice(1)
    .filter((row) => /^\d+$/.test(row[0] || ''))
    .map((row) => {
      const raw = Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));

      return {
        itemLevel: toNumber(row[0]),
        defense: valueByHeader(raw, (header) => header === 'defensa' || header === 'defense'),
        durability: valueByHeader(raw, (header) => header === 'durabilidad' || header === 'durability'),
        damageMin: valueByHeader(raw, (header) => header === 'dano minimo' || header === 'damage min' || header === 'min damage'),
        damageMax: valueByHeader(raw, (header) => header === 'dano maximo' || header === 'damage max' || header === 'max damage'),
        requiredStrength: valueByHeader(raw, (header) => header === 'requiere de fuerza' || header === 'fuerza requerida' || header === 'strength required'),
        requiredAgility: valueByHeader(raw, (header) => header === 'requiere de agilidad' || header === 'agilidad requerida' || header === 'agility required'),
        excellentDefense: valueByHeader(raw, (header) => header === 'excellent defensa' || header === 'excellent defense'),
        excellentRequiredStrength: valueByHeader(raw, (header) => header === 'excellent requiere de fuerza'),
        excellentRequiredAgility: valueByHeader(raw, (header) => header === 'excellent requiere de agilidad'),
        raw,
      };
    });
};

const compactImage = (image, sourceUrl = null) => ({
  publicPath: toPublicImagePath(image),
  sourceUrl,
  localPath: image?.localPath || null,
  size: image?.size || null,
  sha1: image?.sha1 || null,
});

const compactPart = (part) => ({
  name: part.name,
  slug: part.slug || '',
  image: compactImage(part.image, part.imageUrl || null),
  imageError: part.imageError || null,
  levelStats: compactLevelStats(part.tables),
});

const compactItem = (item) => ({
  key: `${item.categorySlug}-${item.slug}`,
  name: item.name,
  title: item.detail?.title || item.name,
  category: item.category,
  categorySlug: item.categorySlug,
  slug: item.slug,
  usableBy: item.usableBy || [],
  listStats: item.listStats || {},
  image: compactImage(item.image, item.source?.imageUrl || null),
  sourceUrl: item.source?.detailUrl || item.source?.frameUrl || item.source?.pageUrl || null,
  imageError: item.imageError || null,
  detailError: item.detailError || null,
  levelStats: compactLevelStats(item.detail?.tables),
  parts: (item.parts || []).map(compactPart),
  detailParts: (item.detail?.parts || []).map(compactPart),
});

const slimLevelStat = (stat) => ({
  itemLevel: stat.itemLevel,
  defense: stat.defense,
  durability: stat.durability,
  damageMin: stat.damageMin,
  damageMax: stat.damageMax,
  requiredStrength: stat.requiredStrength,
  requiredAgility: stat.requiredAgility,
  excellentDefense: stat.excellentDefense,
  excellentRequiredStrength: stat.excellentRequiredStrength,
  excellentRequiredAgility: stat.excellentRequiredAgility,
});

const slimArmorItem = (item) => ({
  key: item.key,
  name: item.name,
  title: item.title,
  category: item.category,
  categorySlug: item.categorySlug,
  slug: item.slug,
  usableBy: item.usableBy,
  listStats: item.listStats,
  image: item.image,
  sourceUrl: item.sourceUrl,
  imageError: item.imageError,
  levelStats: item.levelStats.map(slimLevelStat),
});

const data = JSON.parse(await readFile(DATA_FILE, 'utf8'));
const compactItems = data.items.map(compactItem);
const armorItems = compactItems.filter((item) => ARMOR_CATEGORIES.has(item.category)).map(slimArmorItem);

await mkdir(path.dirname(COMPACT_FILE), { recursive: true });
await mkdir(path.dirname(ARMOR_COMPACT_FILE), { recursive: true });
await writeFile(COMPACT_FILE, `${JSON.stringify(compactItems, null, 2)}\n`);
await writeFile(ARMOR_COMPACT_FILE, `${JSON.stringify(armorItems, null, 2)}\n`);

console.log(JSON.stringify({
  sourceItems: data.items.length,
  compactItems: compactItems.length,
  armorItems: armorItems.length,
  compactFile: COMPACT_FILE,
  armorCompactFile: ARMOR_COMPACT_FILE,
}, null, 2));
