"use client";

import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { COVER_CHAIN_ADDRESS, COVER_CHAIN_ABI, ERC20_ABI, CUSD_ADDRESS } from "@/lib/contracts";
import { formatDate, daysUntil, isExpiringSoon } from "@/lib/utils";
import { useState } from "react";

const COVER_LABELS = ["Device", "Medical", "Weather"];
const COVER_ICONS = ["📱", "💊", "🌾"];

export default function MyPolicies() {
  const { address } = useAccount();
  const chainId = useChainId() as 42220 | 44787;
  const contractAddress = COVER_CHAIN_ADDRESS[chainId];

  const { data: policyIds } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "getUserPolicies",
    args: address ? [address] : undefined,
  });

  if (!policyIds || policyIds.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <p className="font-semibold text-gray-700 mb-1">No active policies</p>
        <p className="text-xs text-gray-400">Buy cover from the Cover tab to get protected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {policyIds.map((id) => (
        <PolicyCard key={id.toString()} policyId={id} contractAddress={contractAddress} chainId={chainId} />
      ))}
    </div>
  );
}

function PolicyCard({
  policyId,
  contractAddress,
  chainId,
}: {
  policyId: bigint;
  contractAddress: `0x${string}`;
  chainId: 42220 | 44787;
}) {
  const cUSD = CUSD_ADDRESS[chainId] as `0x${string}`;
  const [claimEvidence, setClaimEvidence] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [showClaim, setShowClaim] = useState(false);

  const { data: policy } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "policies",
    args: [policyId],
  });

  const { data: plan } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "plans",
    args: policy ? [policy[1]] : undefined,
  });

  const { writeContract: approve, data: approveTx } = useWriteContract();
  const { writeContract: renew } = useWriteContract();
  const { writeContract: submitClaim, data: claimTx } = useWriteContract();
  const { isSuccess: approveOk } = useWaitForTransactionReceipt({ hash: approveTx });
  const { isSuccess: claimOk } = useWaitForTransactionReceipt({ hash: claimTx });

  if (approveOk) {
    renew({ address: contractAddress, abi: COVER_CHAIN_ABI, functionName: "payPremium", args: [policyId] });
  }

  if (!policy || !plan) return null;

  const endDate = new Date(Number(policy[3]) * 1000).toLocaleDateString();
  const isActive = policy[5] && Date.now() / 1000 <= Number(policy[3]);
  const isWeather = plan[0] === 2;

  function handleClaim() {
    if (!claimEvidence || !claimAmount) return;
    submitClaim({
      address: contractAddress,
      abi: COVER_CHAIN_ABI,
      functionName: "submitClaim",
      args: [policyId, claimEvidence, parseUnits(claimAmount, 18)],
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{COVER_ICONS[Number(plan[0])]}</span>
            <div>
              <p className="font-semibold text-gray-800">{plan[1]}</p>
              <p className="text-xs text-gray-400">
                Expires {formatDate(policy[3])}
                {isExpiringSoon(policy[3]) && (
                  <span className="ml-1 text-orange-500 font-medium">· {daysUntil(policy[3])}d left</span>
                )}
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
            }`}
          >
            {isActive ? "Active" : "Expired"}
          </span>
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span>Max payout: {Number(formatUnits(plan[3], 18)).toFixed(0)} cUSD</span>
          <span>Paid: {Number(formatUnits(policy[4], 18)).toFixed(2)} cUSD</span>
        </div>
      </div>

      {isActive && !isWeather && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
          <button
            onClick={() => setShowClaim(!showClaim)}
            className="w-full py-2.5 bg-sky-50 text-sky-700 rounded-xl text-sm font-medium"
          >
            {showClaim ? "Cancel" : "File a claim"}
          </button>

          {showClaim && !claimOk && (
            <div className="space-y-2">
              <input
                value={claimEvidence}
                onChange={(e) => setClaimEvidence(e.target.value)}
                placeholder="Describe what happened (or IPFS hash)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                placeholder={`Amount (max ${Number(formatUnits(plan[3], 18)).toFixed(0)} cUSD)`}
                type="number"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button onClick={handleClaim} className="w-full py-2.5 bg-sky-600 text-white rounded-xl text-sm font-medium">
                Submit claim
              </button>
            </div>
          )}

          {claimOk && (
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-700 font-medium">Claim submitted!</p>
              <p className="text-xs text-green-600 mt-0.5">Validators will review within 3 days.</p>
            </div>
          )}
        </div>
      )}

      {isActive && isWeather && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <p className="text-xs text-gray-400 text-center">
            Weather payout is automatic — no action needed.
          </p>
        </div>
      )}
    </div>
  );
}
