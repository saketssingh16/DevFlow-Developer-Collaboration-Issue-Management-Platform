import { describe, expect, it } from 'vitest';
import { ISSUE_COLUMNS, isIssueColumn } from './issueBoard.js';

describe('issue board status helpers', () => {
  it('accepts only supported Kanban statuses', () => {
    expect(ISSUE_COLUMNS).toContain('TODO');
    expect(isIssueColumn('DONE')).toBe(true);
    expect(isIssueColumn('UNTRUSTED_STATUS')).toBe(false);
  });
});
