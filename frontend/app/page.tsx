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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-gray-700 font-semibold">Opening in MiniPay...</p>
        <p className="text-gray-400 text-xs">Please open this app inside the MiniPay wallet.</p>
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
      <header className="pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-700">CoverChain</h1>
          <p className="text-xs text-gray-400">Micro-insurance powered by Celo. No bank needed.</p>
        </div>
        <span className="mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Celo</span>
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

      <footer className="mt-8 text-center">
        <p className="text-xs text-gray-300">CoverChain &copy; {new Date().getFullYear()} · Built on Celo</p>
      </footer>
    </div>
  );
}
