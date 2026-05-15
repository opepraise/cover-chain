import { formatUnits } from "viem";

export function formatCUSD(value: bigint, decimals = 2): string {
  return Number(formatUnits(value, 18)).toFixed(decimals);
}

export function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
}

export function daysUntil(timestamp: bigint): number {
  const now = Date.now() / 1000;
  return Math.max(0, Math.floor((Number(timestamp) - now) / 86400));
}

export function isExpiringSoon(endDate: bigint, thresholdDays = 7): boolean {
  return daysUntil(endDate) <= thresholdDays && daysUntil(endDate) > 0;
}
