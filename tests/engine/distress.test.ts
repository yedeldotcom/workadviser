import { describe, it, expect } from 'vitest';
import { detectDistress } from '../../src/core/interview/distress';

describe('Distress Detection', () => {
  it('returns no distress for normal messages', () => {
    const result = detectDistress('אני עובד כמפתח תוכנה בחברת הייטק');
    expect(result.detected).toBe(false);
    expect(result.level).toBe('none');
    expect(result.action.type).toBe('continue');
  });

  it('detects mild distress with one indicator', () => {
    const result = detectDistress('אני לא יכול להתמודד עם הרעש במשרד');
    expect(result.detected).toBe(true);
    expect(result.level).toBe('mild');
    expect(result.action.type).toBe('reduce_depth');
  });

  it('detects moderate distress with multiple indicators', () => {
    const result = detectDistress('אני לא יכול להמשיך, זה יותר מדי בשבילי');
    expect(result.detected).toBe(true);
    expect(result.level).toBe('moderate');
    expect(result.action.type).toBe('offer_pause');
  });

  it('detects severe distress and stops', () => {
    const result = detectDistress('לא רוצה לחיות ככה יותר');
    expect(result.detected).toBe(true);
    expect(result.level).toBe('severe');
    expect(result.action.type).toBe('stop_and_contain');
  });

  it('provides Hebrew message for severe distress', () => {
    const result = detectDistress('חושב על לפגוע בעצמי');
    expect(result.action.type).toBe('stop_and_contain');
    if (result.action.type === 'stop_and_contain') {
      expect(result.action.messageHe).toContain('1201');
    }
  });
});
