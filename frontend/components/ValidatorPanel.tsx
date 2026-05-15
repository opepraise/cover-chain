"use client";

import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { COVER_CHAIN_ADDRESS, COVER_CHAIN_ABI, ERC20_ABI, CUSD_ADDRESS } from "@/lib/contracts";
import { formatCUSD } from "@/lib/utils";

export default function ValidatorPanel() {
  const { address } = useAccount();
  const chainId = useChainId() as 42220 | 44787;
  const contractAddress = COVER_CHAIN_ADDRESS[chainId];
  const cUSD = CUSD_ADDRESS[chainId] as `0x${string}`;

  const { data: isValidator } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "isValidator",
    args: address ? [address] : undefined,
  });

  const { data: validators } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "getValidators",
  });

  const { data: stakeAmount } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "VALIDATOR_STAKE",
  });

  const { data: riskPool } = useReadContract({
    address: contractAddress,
    abi: COVER_CHAIN_ABI,
    functionName: "riskPool",
  });

  const { writeContract: approve, data: approveTx } = useWriteContract();
  const { writeContract: stake } = useWriteContract();
  const { writeContract: unstake } = useWriteContract();
  const { isSuccess: approveOk } = useWaitForTransactionReceipt({ hash: approveTx });

  function handleStake() {
    if (!stakeAmount || !contractAddress) return;
    approve({ address: cUSD, abi: ERC20_ABI, functionName: "approve", args: [contractAddress, stakeAmount] });
  }

  if (approveOk && !isValidator) {
    stake({ address: contractAddress, abi: COVER_CHAIN_ABI, functionName: "stakeAsValidator" });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="font-semibold text-gray-800 mb-3">Risk Pool</p>
        <p className="text-2xl font-bold text-sky-700">
          {riskPool ? formatCUSD(riskPool) : "0.00"} cUSD
        </p>
        <p className="text-xs text-gray-400 mt-1">Funds available for claim payouts</p>
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>Active validators</span>
          <span className="font-semibold text-gray-700">{validators?.length ?? 0}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="font-semibold text-gray-800">Become a Validator</p>
        <p className="text-xs text-gray-500">
          Stake 0.0001 cUSD to vote on insurance claims. Earn 1% of each approved claim payout.
          Your stake is returned in full when you choose to leave.
        </p>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
          Validators are responsible for honest voting. Majority vote determines payout.
        </div>

        {!isValidator ? (
          <button
            onClick={handleStake}
            className="w-full py-3 bg-sky-600 text-white rounded-xl font-semibold"
          >
            Stake {stakeAmount ? Number(formatUnits(stakeAmount, 18)).toFixed(0) : "10"} cUSD to Validate
          </button>
        ) : (
          <div className="space-y-2">
            <div className="bg-sky-50 rounded-xl p-3 text-center">
              <p className="text-sky-700 font-medium text-sm">You are an active validator</p>
              <p className="text-xs text-sky-600 mt-0.5">
                You earn 1% of every claim you help approve.
              </p>
            </div>
            <button
              onClick={() => unstake({ address: contractAddress, abi: COVER_CHAIN_ABI, functionName: "unstakeValidator" })}
              className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm"
            >
              Unstake and leave
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
