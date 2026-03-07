import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface BarrierSeed {
  id: string;
  category: string;
  nameHe: string;
  nameEn?: string;
  descriptionHe: string;
  descriptionEn?: string;
}

interface FamilySeed {
  name: string;
  nameHe: string;
  description: string;
}

interface TemplateSeed {
  stableRefId: string;
  family: string;
  barrierTags: string[];
  employmentStageTags: string[];
  workplaceTypeTags: string[];
  actorTags: string[];
  disclosureSuitability: string[];
  timeHorizon: string;
  contentHe: string;
}

function loadJson<T>(filename: string): T {
  const filepath = path.join(__dirname, '..', 'knowledge', filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

async function main() {
  console.log('Seeding knowledge base...');

  // Seed knowledge sources
  const sources = await Promise.all([
    prisma.knowledgeSource.upsert({
      where: { id: 'src-barriers-questionnaire' },
      update: {},
      create: {
        id: 'src-barriers-questionnaire',
        name: 'Employment Barriers Questionnaire',
        role: 'classification',
        description: 'Classification authority for barrier definitions',
      },
    }),
    prisma.knowledgeSource.upsert({
      where: { id: 'src-background' },
      update: {},
      create: {
        id: 'src-background',
        name: 'Background to Barriers Questionnaire',
        role: 'interpretation',
        description: 'Interpretation authority for barrier meaning',
      },
    }),
    prisma.knowledgeSource.upsert({
      where: { id: 'src-interview-patterns' },
      update: {},
      create: {
        id: 'src-interview-patterns',
        name: 'Interview-Derived Patterns',
        role: 'applied_pattern',
        description: 'Applied workplace pattern authority from interviews',
      },
    }),
    prisma.knowledgeSource.upsert({
      where: { id: 'src-org-procedures' },
      update: {},
      create: {
        id: 'src-org-procedures',
        name: 'Organizational Procedures Guide',
        role: 'implementation',
        description: 'Employer implementation authority',
      },
    }),
  ]);

  // Seed barriers as knowledge items
  const barriers = loadJson<BarrierSeed[]>('barriers.json');
  for (const b of barriers) {
    await prisma.knowledgeItem.upsert({
      where: { id: b.id },
      update: { contentHe: b.descriptionHe, contentEn: b.descriptionEn },
      create: {
        id: b.id,
        type: 'barrier_definition',
        contentHe: b.descriptionHe,
        contentEn: b.descriptionEn,
        sourceId: sources[0].id,
        promotionState: 'validated',
        scope: 'global',
      },
    });
  }
  console.log(`  Seeded ${barriers.length} barriers`);

  // Seed recommendation families
  const families = loadJson<FamilySeed[]>('recommendation-families.json');
  for (const f of families) {
    await prisma.recommendationFamily.upsert({
      where: { name: f.name },
      update: { nameHe: f.nameHe, description: f.description },
      create: {
        name: f.name,
        nameHe: f.nameHe,
        description: f.description,
      },
    });
  }
  console.log(`  Seeded ${families.length} recommendation families`);

  // Seed recommendation templates
  const templates = loadJson<TemplateSeed[]>('recommendation-templates.json');
  for (const t of templates) {
    const family = await prisma.recommendationFamily.findUnique({
      where: { name: t.family },
    });
    if (!family) {
      console.warn(`  Warning: family "${t.family}" not found, skipping ${t.stableRefId}`);
      continue;
    }

    await prisma.recommendationTemplate.upsert({
      where: { stableRefId: t.stableRefId },
      update: {
        contentHe: t.contentHe,
        barrierTags: t.barrierTags,
        employmentStageTags: t.employmentStageTags as never[],
        workplaceTypeTags: t.workplaceTypeTags as never[],
        actorTags: t.actorTags as never[],
        disclosureSuitability: t.disclosureSuitability as never[],
        timeHorizon: t.timeHorizon as never,
      },
      create: {
        familyId: family.id,
        stableRefId: t.stableRefId,
        contentHe: t.contentHe,
        barrierTags: t.barrierTags,
        employmentStageTags: t.employmentStageTags as never[],
        workplaceTypeTags: t.workplaceTypeTags as never[],
        actorTags: t.actorTags as never[],
        disclosureSuitability: t.disclosureSuitability as never[],
        timeHorizon: t.timeHorizon as never,
        lifecycleState: 'active',
        confidenceLevel: 'medium',
      },
    });
  }
  console.log(`  Seeded ${templates.length} recommendation templates`);

  // Seed communication framings as knowledge items
  interface FramingSeed {
    id: string;
    audience: string;
    purpose: string;
    contentHe: string;
  }
  const framings = loadJson<FramingSeed[]>('communication-framings.json');
  for (const f of framings) {
    await prisma.knowledgeItem.upsert({
      where: { id: f.id },
      update: { contentHe: f.contentHe },
      create: {
        id: f.id,
        type: 'communication_framing',
        contentHe: f.contentHe,
        promotionState: 'validated',
        scope: f.audience,
      },
    });
  }
  console.log(`  Seeded ${framings.length} communication framings`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
