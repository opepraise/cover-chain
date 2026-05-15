"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import CoverPlans from "@/components/CoverPlans";
import MyPolicies from "@/components/MyPolicies";
import ClaimsView from "@/components/ClaimsView";
import ValidatorPanel from "@/components/ValidatorPanel";

type Tab = "plans" | "policies" | "claims" | "validator";

export default function Home() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("plans");

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Opening in MiniPay...</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "plans", label: "Cover" },
    { id: "policies", label: "My Policies" },
    { id: "claims", label: "Claims" },
    { id: "validator", label: "Validate" },
  ];

  return (
    <div className="min-h-screen max-w-md mx-auto px-4 pb-8">
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-sky-700">CoverChain</h1>
        <p className="text-xs text-gray-400">Micro-insurance powered by Celo. No bank needed.</p>
      </header>

      <nav className="flex bg-white rounded-xl p-1 shadow-sm mb-5 gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === t.id ? "bg-sky-600 text-white" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === "plans" && <CoverPlans />}
      {activeTab === "policies" && <MyPolicies />}
      {activeTab === "claims" && <ClaimsView />}
      {activeTab === "validator" && <ValidatorPanel />}
    </div>
  );
}
