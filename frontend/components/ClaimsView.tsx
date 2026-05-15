"use client";

import { useAccount, useChainId, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { COVER_CHAIN_ADDRESS, COVER_CHAIN_ABI } from "@/lib/contracts";
import { formatDate } from "@/lib/utils";

const CLAIM_STATUS = ["Pending", "Approved", "Rejected", "Paid"];
const STATUS_COLORS = ["text-yellow-600", "text-blue-600", "text-red-500", "text-green-600"];

export default function ClaimsView() {
  const { address } = useAccount();
  const chainId = useChainId() as 42220 | 44787;
  const contractAddress = COVER_CHAIN_ADDRESS[chainId];

  const { data: claimIds } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "getUserClaims",
    args: address ? [address] : undefined,
  });

  if (!claimIds || claimIds.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-4xl mb-3">📋</p>
        <p className="font-semibold text-gray-700 mb-1">No claims yet</p>
        <p className="text-xs text-gray-400">File a claim from My Policies when needed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-800">Your Claims</h2>
      {claimIds.map((id) => (
        <ClaimCard key={id.toString()} claimId={id} contractAddress={contractAddress} />
      ))}
    </div>
  );
}

function ClaimCard({ claimId, contractAddress }: { claimId: bigint; contractAddress: `0x${string}` }) {
  const { data: claim } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "claims",
    args: [claimId],
  });

  if (!claim) return null;

  const status = Number(claim[4]);
  const amount = Number(formatUnits(claim[3], 18)).toFixed(2);
  const date = new Date(Number(claim[5]) * 1000).toLocaleDateString();
  const votingDeadline = new Date((Number(claim[5]) + 3 * 86400) * 1000).toLocaleDateString();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between mb-2">
        <p className="font-medium text-gray-800">Claim #{claimId.toString()}</p>
        <span className={`text-xs font-semibold ${STATUS_COLORS[status]}`}>
          {CLAIM_STATUS[status]}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-1">Amount: {amount} cUSD</p>
      <p className="text-xs text-gray-400 mb-1">Submitted: {date}</p>
      {status === 0 && (
        <p className="text-xs text-gray-400">
          Voting closes: {votingDeadline} · Votes: {claim[6].toString()} approve / {claim[7].toString()} reject
        </p>
      )}
      {claim[2] && (
        <p className="text-xs text-gray-400 mt-1 italic">"{claim[2]}"</p>
      )}
    </div>
  );
}
