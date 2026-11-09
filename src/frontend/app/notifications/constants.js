// DBC22-7324: notification setting options; ids match apps.events.enums NotificationEventType,
// NotificationSeverity, NotificationStatus and NotificationCreator

export const EVENT_TYPE_OPTIONS = [
  { id: 'incidents', name: 'Incidents' },
  { id: 'plannedEvents', name: 'Planned events' },
  { id: 'roadConditions', name: 'Road conditions' },
  { id: 'chainUps', name: 'Chain-ups' },
];

export const SEVERITY_OPTIONS = [
  { id: 'closures', name: 'Closures' },
  { id: 'majorEvents', name: 'Majors' },
  { id: 'minorEvents', name: 'Minors' },
];

// Everyone sees every status; only approvers receive approval request emails
export const STATUS_OPTIONS = [
  { id: 'overdue', name: 'Overdue' },
  { id: 'updateDueSoon', name: 'Update due in the next 15 minutes' },
  { id: 'new', name: 'New' },
  { id: 'updated', name: 'Updated' },
  { id: 'cleared', name: 'Cleared' },
  { id: 'reconfirmed', name: 'Reconfirmed' },
  { id: 'approvalPending', name: 'Approval pending' },
  { id: 'approved', name: 'Approved' },
];

// adminName: as an admin reads another user's settings (DBC22-7325)
export const CREATOR_OPTIONS = [
  { id: 'all', name: 'All events', adminName: 'All events' },
  { id: 'organization', name: 'Only events created by my organization',
    adminName: "Only events created by the user's organization" },
  { id: 'me', name: 'Only events created by me', adminName: 'Only events created by the user' },
];

// Comma separated option names for ids, e.g. for read-only summaries
export function getOptionNames(options, ids) {
  return options.filter((option) => (ids || []).includes(option.id)).map((option) => option.name).join(', ');
}

// Event types that severity applies to
export const SEVERITY_EVENT_TYPES = ['incidents', 'plannedEvents'];

// Every option on, the default when notifications are turned on
export function getDefaultSettings(areaIds) {
  return {
    notification_areas: [...areaIds],
    notification_types: EVENT_TYPE_OPTIONS.map((option) => option.id),
    notification_severities: SEVERITY_OPTIONS.map((option) => option.id),
    notification_statuses: STATUS_OPTIONS.map((option) => option.id),
    notification_creator: 'all',
  };
}
