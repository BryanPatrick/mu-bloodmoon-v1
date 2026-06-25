import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_FILE = 'references/game-data/guiamuonline-items-data.json';
const LEGACY_EQUIPMENT_ITEMS_FILE = 'apps/web/data/muEquipmentItems.generated.json';
const EQUIPMENT_INDEX_FILE = 'apps/web/data/muEquipmentIndex.generated.json';
const EQUIPMENT_DETAILS_DIR = 'apps/web/data/mu-equipment-details';
const PUBLIC_IMAGE_BASE = '/images/game-assets/guiamuonline/items/original';
const PUBLIC_IMAGE_LOCAL_BASE = 'apps/web/public/images/game-assets/guiamuonline/items/original';
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
  image?.filename ? `${PUBLIC_IMAGE_BASE}/${image.filename}` : null;

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
  localPath: image?.filename ? `${PUBLIC_IMAGE_LOCAL_BASE}/${image.filename}` : null,
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

const slimPart = (part) => ({
  name: part.name,
  slug: part.slug,
  image: part.image,
  imageError: part.imageError,
  levelStats: part.levelStats.map(slimLevelStat),
});

const appEquipmentItem = (item) => ({
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
  detailError: item.detailError,
  levelStats: item.levelStats.map(slimLevelStat),
  parts: item.parts.map(slimPart),
  detailParts: item.detailParts.map(slimPart),
});

const summaryEquipmentItem = (item) => ({
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
  detailError: item.detailError,
});

const readJsonIfExists = async (file) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

const readExistingDetailItems = async () => {
  try {
    const files = await readdir(EQUIPMENT_DETAILS_DIR);
    const jsonFiles = files.filter((file) => file.endsWith('.json')).sort();
    const groups = await Promise.all(
      jsonFiles.map((file) => readJsonIfExists(path.join(EQUIPMENT_DETAILS_DIR, file)))
    );

    return groups.flat().filter(Boolean);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

const sourceData = await readJsonIfExists(DATA_FILE);
const existingEquipmentItems = await readJsonIfExists(LEGACY_EQUIPMENT_ITEMS_FILE);
const existingDetailItems = await readExistingDetailItems();
const compactItems = sourceData?.items
  ? sourceData.items.map(compactItem)
  : existingEquipmentItems?.length
    ? existingEquipmentItems
    : existingDetailItems;

if (!compactItems?.length) {
  throw new Error(`No Guia MU data found. Run scripts/collect-guiamuonline-items.mjs first or keep ${LEGACY_EQUIPMENT_ITEMS_FILE} available.`);
}

const equipmentItems = compactItems.map(appEquipmentItem);
const equipmentIndex = equipmentItems.map(summaryEquipmentItem);
const armorItems = equipmentIndex.filter((item) => ARMOR_CATEGORIES.has(item.category));
const equipmentDetailsByCategory = equipmentItems.reduce((groups, item) => {
  const current = groups.get(item.categorySlug) || [];
  current.push(item);
  groups.set(item.categorySlug, current);
  return groups;
}, new Map());

await mkdir(path.dirname(EQUIPMENT_INDEX_FILE), { recursive: true });
await rm(EQUIPMENT_DETAILS_DIR, { recursive: true, force: true });
await mkdir(EQUIPMENT_DETAILS_DIR, { recursive: true });
await writeFile(EQUIPMENT_INDEX_FILE, `${JSON.stringify(equipmentIndex, null, 2)}\n`);

for (const [categorySlug, items] of equipmentDetailsByCategory) {
  await writeFile(
    path.join(EQUIPMENT_DETAILS_DIR, `${categorySlug}.json`),
    `${JSON.stringify(items, null, 2)}\n`
  );
}

console.log(JSON.stringify({
  sourceItems: sourceData?.items?.length || existingEquipmentItems?.length || existingDetailItems.length || 0,
  compactItems: compactItems.length,
  equipmentItems: equipmentItems.length,
  equipmentIndex: equipmentIndex.length,
  equipmentDetailFiles: equipmentDetailsByCategory.size,
  armorItems: armorItems.length,
  legacyInputFile: LEGACY_EQUIPMENT_ITEMS_FILE,
  equipmentIndexFile: EQUIPMENT_INDEX_FILE,
  equipmentDetailsDir: EQUIPMENT_DETAILS_DIR,
}, null, 2));
