export enum SocketEvent {
  ISSUE_CREATED = 'issue.created',
  ISSUE_UPDATED = 'issue.updated',
  ISSUE_DELETED = 'issue.deleted',
  ISSUE_ASSIGNED = 'issue.assigned',
  ISSUE_STATUS_CHANGED = 'issue.status_changed',
  COMMENT_CREATED = 'comment.created',
  NOTIFICATION_CREATED = 'notification.created'
}

export interface IssueCreatedEventPayload {
  issueId: string;
  projectId: string;
  organizationId: string;
  publicId: string;
  title: string;
  actorId: string;
}

export interface IssueUpdatedEventPayload {
  issueId: string;
  projectId: string;
  organizationId: string;
  publicId: string;
  changes: Record<string, unknown>;
  actorId: string;
}

export interface IssueAssignedEventPayload {
  issueId: string;
  projectId: string;
  organizationId: string;
  assigneeId: string | null;
  actorId: string;
}

export interface IssueStatusChangedEventPayload {
  issueId: string;
  projectId: string;
  organizationId: string;
  previousStatus: string;
  newStatus: string;
  actorId: string;
}

export interface CommentCreatedEventPayload {
  commentId: string;
  issueId: string;
  projectId: string;
  organizationId: string;
  authorId: string;
}

export interface NotificationCreatedEventPayload {
  notificationId: string;
  userId: string;
  organizationId: string;
  title: string;
}
