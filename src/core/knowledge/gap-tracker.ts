import { PrismaClient } from '@prisma/client';
import { EmploymentStage, WorkplaceType, GapType } from '../types/enums';

export interface CoverageCell {
  barrier: string;
  employmentStage: EmploymentStage;
  workplaceType?: WorkplaceType;
  templateCount: number;
  activeTemplateCount: number;
}

export interface GapSummary {
  totalCells: number;
  coveredCells: number;
  weakCells: CoverageCell[];
  uncoveredCells: CoverageCell[];
}

export class GapTracker {
  constructor(private prisma: PrismaClient) {}

  async analyzeCoverage(barrierCategories: string[]): Promise<GapSummary> {
    const stages = Object.values(EmploymentStage);
    const templates = await this.prisma.recommendationTemplate.findMany({
      where: { lifecycleState: { in: ['active', 'monitored', 'experimental'] } },
    });

    const cells: CoverageCell[] = [];

    for (const barrier of barrierCategories) {
      for (const stage of stages) {
        const matching = templates.filter(
          (t) =>
            (t.barrierTags.length === 0 || t.barrierTags.includes(barrier)) &&
            (t.employmentStageTags.length === 0 ||
              t.employmentStageTags.includes(stage as never))
        );

        const active = matching.filter((t) => t.lifecycleState === 'active');

        cells.push({
          barrier,
          employmentStage: stage,
          templateCount: matching.length,
          activeTemplateCount: active.length,
        });
      }
    }

    const uncovered = cells.filter((c) => c.templateCount === 0);
    const weak = cells.filter((c) => c.templateCount > 0 && c.activeTemplateCount === 0);

    return {
      totalCells: cells.length,
      coveredCells: cells.length - uncovered.length,
      weakCells: weak,
      uncoveredCells: uncovered,
    };
  }

  async recordGap(
    gapType: GapType,
    description: string,
    context: {
      barrier?: string;
      employmentStage?: EmploymentStage;
      workplaceType?: WorkplaceType;
      sourceNeeded?: string;
    }
  ) {
    return this.prisma.gapRecord.create({
      data: {
        gapType: gapType as never,
        description,
        barrier: context.barrier,
        employmentStage: context.employmentStage as never,
        workplaceType: context.workplaceType as never,
        sourceNeeded: context.sourceNeeded,
      },
    });
  }
}
