"use client";

import { useState } from "react";
import { useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { COVER_CHAIN_ADDRESS, COVER_CHAIN_ABI, ERC20_ABI, CUSD_ADDRESS } from "@/lib/contracts";
import { formatCUSD } from "@/lib/utils";

const PLAN_ICONS = ["📱", "💊", "🌾"];
const PLAN_DESCRIPTIONS = [
  "Covers phone loss or theft. Your MiniPay wallet, protected.",
  "Covers hospital visits and medication costs.",
  "Auto-payout when rainfall drops below threshold. No claims needed.",
];

export default function CoverPlans() {
  const chainId = useChainId() as 42220 | 44787;
  const contractAddress = COVER_CHAIN_ADDRESS[chainId];
  const cUSD = CUSD_ADDRESS[chainId] as `0x${string}`;

  const [selected, setSelected] = useState<number | null>(null);
  const [months, setMonths] = useState(1);

  const { data: planCount } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "getPlanCount",
  });

  const { writeContract: approve, data: approveTx } = useWriteContract();
  const { writeContract: purchase, data: purchaseTx } = useWriteContract();
  const { isSuccess: approveOk } = useWaitForTransactionReceipt({ hash: approveTx });
  const { isSuccess: purchaseOk } = useWaitForTransactionReceipt({ hash: purchaseTx });

  const count = Number(planCount ?? 3);

  function handleBuy(planId: number, premium: bigint) {
    const total = premium * BigInt(months);
    approve({ address: cUSD, abi: ERC20_ABI, functionName: "approve", args: [contractAddress, total] });
    setSelected(planId);
  }

  if (approveOk && selected !== null && !purchaseOk) {
    purchase({
      address: contractAddress,
      abi: COVER_CHAIN_ABI,
      functionName: "purchasePolicy",
      args: [BigInt(selected), BigInt(months)],
    });
  }

  if (purchaseOk) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-sky-700 text-lg">Policy activated!</p>
        <p className="text-xs text-gray-400 mt-1">View it in My Policies tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-gray-800 text-sm">Select a plan</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Duration:</span>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
          >
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {Array.from({ length: count }, (_, i) => (
        <PlanCard
          key={i}
          planId={i}
          contractAddress={contractAddress}
          icon={PLAN_ICONS[i]}
          description={PLAN_DESCRIPTIONS[i]}
          months={months}
          onBuy={handleBuy}
          selected={selected === i}
        />
      ))}
    </div>
  );
}

function PlanCard({
  planId,
  contractAddress,
  icon,
  description,
  months,
  onBuy,
  selected,
}: {
  planId: number;
  contractAddress: `0x${string}`;
  icon: string;
  description: string;
  months: number;
  onBuy: (id: number, premium: bigint) => void;
  selected: boolean;
}) {
  const { data: plan } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "plans",
    args: [BigInt(planId)],
  });

  if (!plan) return null;

  const premium = Number(formatUnits(plan[2], 18)).toFixed(2);
  const maxPayout = Number(formatUnits(plan[3], 18)).toFixed(0);
  const total = Number(premium) * months;
  const isWeather = plan[0] === 2;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{plan[1]}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="bg-sky-50 rounded-xl p-3 flex justify-between items-center mb-3">
        <div>
          <p className="text-xs text-sky-600 font-medium">{premium} cUSD/month</p>
          <p className="text-xs text-gray-400">Max payout: {maxPayout} cUSD</p>
        </div>
        {isWeather && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Auto-payout
          </span>
        )}
      </div>

      <button
        onClick={() => onBuy(planId, plan[2])}
        disabled={selected}
        className="w-full py-2.5 bg-sky-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
      >
        {selected ? "Processing..." : `Cover for ${total.toFixed(2)} cUSD`}
      </button>
    </div>
  );
}
