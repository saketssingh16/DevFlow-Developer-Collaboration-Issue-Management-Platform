export const ISSUE_COLUMNS = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'] as const;

export function isIssueColumn(value: string): value is (typeof ISSUE_COLUMNS)[number] {
  return ISSUE_COLUMNS.includes(value as (typeof ISSUE_COLUMNS)[number]);
}
