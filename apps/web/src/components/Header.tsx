import React from 'react';
import { Environment } from '@postty/contracts';
import { Layers, Settings, Cloud, User, ChevronDown } from 'lucide-react';

interface HeaderProps {
  environments: Environment[];
  activeEnvId: string | null;
  onSelectEnv: (id: string | null) => void;
  onOpenEnvModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  environments,
  activeEnvId,
  onSelectEnv,
  onOpenEnvModal,
}) => {
  const activeEnv = environments.find((e) => e.id === activeEnvId);

  return (
    <header className="h-14 border-b border-postty-border bg-postty-sidebar flex items-center justify-between px-4">
      {/* Brand & Workspace */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-200 bg-clip-text text-transparent">
            Postty
          </span>
        </div>
        <div className="h-4 w-[1px] bg-postty-border mx-2" />
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
          <span className="text-slate-500">Workspace:</span>
          <span className="hover:text-white cursor-pointer transition-colors">Personal Space</span>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3">
        {/* Environment Picker */}
        <div className="flex items-center bg-postty-card border border-postty-border rounded-md px-2.5 py-1 text-xs">
          <span className="text-slate-500 mr-2">Env:</span>
          <select
            value={activeEnvId || ''}
            onChange={(e) => onSelectEnv(e.target.value || null)}
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-2 font-medium"
          >
            <option value="" className="bg-postty-card">No Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id} className="bg-postty-card">
                {env.name}
              </option>
            ))}
          </select>
          <button
            onClick={onOpenEnvModal}
            title="Manage Environments"
            className="p-1 hover:text-indigo-400 text-slate-400 transition-colors ml-1"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Cloud className="w-3.5 h-3.5" />
          <span>Synced</span>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-postty-border">
          <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-500/40 flex items-center justify-center text-xs font-semibold text-indigo-300">
            <User className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-300 hidden sm:inline">maksim@postty.dev</span>
        </div>
      </div>
    </header>
  );
};
