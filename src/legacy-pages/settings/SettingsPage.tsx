"use client";

import React, { useState } from 'react';
import { useKeyboardCommander } from '../../hooks/useKeyboardCommander';
import { ShortcutCheatsheet } from '../../components/keyboard/ShortcutCheatsheet';
import { ShortcutConfigPanel } from '../../components/keyboard/ShortcutConfigPanel';
import { OneTimeLinkGenerator } from '../../components/share/OneTimeLinkGenerator';

  const SettingsPage: React.FC = () => {
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  // Core orchestration logic mapping registry targets to client action mutations
  const operationalActions = {
    NAV_NODES: () => console.log('Routing -> /nodes'),
    NAV_ALERTS: () => console.log('Routing -> /alerts'),
    NAV_VAULTS: () => console.log('Routing -> /vaults'),
    ACT_ACK_ALERT: () => alert('Dispatched: Active Alert Acknowledged'),
    TOGGLE_THEME: () => document.documentElement.classList.toggle('dark'),
    // Append remaining mapped routing executions as specified by actionId bindings
  };

  useKeyboardCommander(operationalActions, () => setCheatsheetOpen(true));

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-400">Configure global dashboard parameters and peripheral interactions.</p>
      </div>

      <ShortcutConfigPanel />

      <OneTimeLinkGenerator />

      <button
        type="button"
        className="rounded-md border border-danger-text px-4 py-2 text-sm font-semibold text-danger-text transition hover:bg-danger-text hover:text-white"
        onClick={async () => {
          await fetch('/api/share/revoke-all', { method: 'POST' });
        }}
      >
        Revoke All Shared Links
      </button>

      <ShortcutCheatsheet 
        isOpen={cheatsheetOpen} 
        onClose={() => setCheatsheetOpen(false)} 
      />
    </div>
  );
};

export default SettingsPage;