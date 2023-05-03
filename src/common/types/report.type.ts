export enum ReportStatus  {
  Acknowledged = 'Acknowledged',
  Rejected = 'Rejected',
  Failed = 'Failed',
}

export type Report = {
  reportKey: string;
  status: ReportStatus
}