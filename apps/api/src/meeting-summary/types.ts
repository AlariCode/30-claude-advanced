export interface ActionItem {
  task: string
  assignee: string | null
}

export interface SummaryResult {
  summary: string
  actionItems: ActionItem[]
  decisions: string[]
}
