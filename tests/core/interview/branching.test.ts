import { describe, it, expect } from 'vitest';
import { getRequiredQuestionIds, isInterviewComplete } from '../../../src/core/interview/branching';

describe('branching', () => {
  describe('getRequiredQuestionIds', () => {
    it('returns all required question IDs', () => {
      const ids = getRequiredQuestionIds();
      expect(ids.length).toBeGreaterThan(0);
      // Required questions: onb_2, bar_1, dis_1, dis_2
      expect(ids).toContain('onb_2');
      expect(ids).toContain('bar_1');
      expect(ids).toContain('dis_1');
      expect(ids).toContain('dis_2');
    });

    it('does not include optional questions', () => {
      const ids = getRequiredQuestionIds();
      // Optional: onb_1, emp_1, emp_2, emp_3, bar_2, bar_3, trg_1, trg_2, cls_1
      expect(ids).not.toContain('onb_1');
      expect(ids).not.toContain('emp_1');
      expect(ids).not.toContain('cls_1');
    });
  });

  describe('isInterviewComplete', () => {
    it('returns false when no questions answered', () => {
      expect(isInterviewComplete(new Set())).toBe(false);
    });

    it('returns false when only some required questions answered', () => {
      const answered = new Set<string | null>(['onb_2', 'bar_1']);
      expect(isInterviewComplete(answered)).toBe(false);
    });

    it('returns true when all required questions answered', () => {
      const answered = new Set<string | null>(['onb_2', 'bar_1', 'dis_1', 'dis_2']);
      expect(isInterviewComplete(answered)).toBe(true);
    });

    it('returns true when required + optional questions answered', () => {
      const answered = new Set<string | null>([
        'onb_1', 'onb_2', 'emp_1', 'bar_1', 'bar_2', 'dis_1', 'dis_2', 'cls_1',
      ]);
      expect(isInterviewComplete(answered)).toBe(true);
    });
  });
});
