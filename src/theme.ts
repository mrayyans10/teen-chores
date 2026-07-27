export const colors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  points: '#CA8A04',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Status -> {label, bg, fg} for chips. */
export const statusStyles: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  assigned: { label: 'To do', bg: colors.primaryLight, fg: colors.primaryDark },
  submitted: { label: 'Pending review', bg: colors.warningLight, fg: colors.warning },
  approved: { label: 'Approved', bg: colors.successLight, fg: colors.success },
  declined: { label: 'Needs redo', bg: colors.dangerLight, fg: colors.danger },
};
