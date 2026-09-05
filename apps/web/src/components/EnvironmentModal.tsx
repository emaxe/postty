import React, { useState } from 'react';
import { Environment, EnvironmentVariable } from '@postty/contracts';
import { X, Plus, Trash2, Eye, EyeOff, Shield } from 'lucide-react';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: Environment[];
  onSaveEnvironments: (updated: Environment[]) => void;
  activeEnvId: string | null;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  environments,
  onSaveEnvironments,
  activeEnvId,
}) => {
  const [envs, setEnvs] = useState<Environment[]>(environments);
  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    activeEnvId || environments[0]?.id || ''
  );
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const currentEnv = envs.find((e) => e.id === selectedEnvId);

  const handleAddEnv = () => {
    const newEnv: Environment = {
      id: crypto.randomUUID(),
      workspaceId: '00000000-0000-0000-0000-000000000001',
      name: `New Environment ${envs.length + 1}`,
      variables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...envs, newEnv];
    setEnvs(updated);
    setSelectedEnvId(newEnv.id);
  };

  const handleAddVariable = () => {
    if (!currentEnv) return;
    const newVar: EnvironmentVariable = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
      isSecret: false,
    };
    const updated = envs.map((e) =>
      e.id === currentEnv.id
        ? { ...e, variables: [...e.variables, newVar] }
        : e
    );
    setEnvs(updated);
  };

  const handleUpdateVariable = (
    varIndex: number,
    updates: Partial<EnvironmentVariable>
  ) => {
    if (!currentEnv) return;
    const vars = [...currentEnv.variables];
    vars[varIndex] = { ...vars[varIndex], ...updates };
    const updated = envs.map((e) =>
      e.id === currentEnv.id ? { ...e, variables: vars } : e
    );
    setEnvs(updated);
  };

  const handleDeleteVariable = (varIndex: number) => {
    if (!currentEnv) return;
    const vars = currentEnv.variables.filter((_, i) => i !== varIndex);
    const updated = envs.map((e) =>
      e.id === currentEnv.id ? { ...e, variables: vars } : e
    );
    setEnvs(updated);
  };

  const toggleSecretMask = (varId: string) => {
    setShowSecretMap((prev) => ({ ...prev, [varId]: !prev[varId] }));
  };

  const handleSave = () => {
    onSaveEnvironments(envs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-postty-card border border-postty-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-postty-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Manage Environments & Secrets</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Environments Sidebar */}
          <div className="w-56 border-r border-postty-border bg-postty-sidebar p-3 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider px-1">
              <span>Environments</span>
              <button
                onClick={handleAddEnv}
                title="Add Environment"
                className="hover:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {envs.map((e) => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEnvId(e.id)}
                  className={`px-3 py-2 rounded-lg text-xs cursor-pointer font-medium truncate transition-colors ${
                    selectedEnvId === e.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-300 hover:bg-postty-card'
                  }`}
                >
                  {e.name}
                </div>
              ))}
            </div>
          </div>

          {/* Variables Table */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {currentEnv ? (
              <>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={currentEnv.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setEnvs(
                        envs.map((env) =>
                          env.id === currentEnv.id ? { ...env, name } : env
                        )
                      );
                    }}
                    className="bg-transparent text-sm font-bold text-white border-b border-transparent focus:border-indigo-500 focus:outline-none px-1 py-0.5"
                  />
                  <button
                    onClick={handleAddVariable}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Variable
                  </button>
                </div>

                <div className="border border-postty-border rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-postty-sidebar border-b border-postty-border text-slate-400">
                      <tr>
                        <th className="w-8 p-2 text-center">✓</th>
                        <th className="p-2">Variable</th>
                        <th className="p-2">Value</th>
                        <th className="w-20 p-2 text-center">Secret</th>
                        <th className="w-8 p-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-postty-border">
                      {currentEnv.variables.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-6 text-center text-slate-500 italic"
                          >
                            No variables in this environment. Click "Add Variable" to create one.
                          </td>
                        </tr>
                      ) : (
                        currentEnv.variables.map((v, idx) => {
                          const isRevealed = showSecretMap[v.id];

                          return (
                            <tr key={v.id} className="hover:bg-postty-sidebar/50">
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={v.enabled}
                                  onChange={(e) =>
                                    handleUpdateVariable(idx, { enabled: e.target.checked })
                                  }
                                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="p-2 font-mono">
                                <input
                                  type="text"
                                  placeholder="VARIABLE_NAME"
                                  value={v.key}
                                  onChange={(e) =>
                                    handleUpdateVariable(idx, { key: e.target.value })
                                  }
                                  className="w-full bg-transparent text-slate-200 focus:outline-none"
                                />
                              </td>
                              <td className="p-2 font-mono relative">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type={v.isSecret && !isRevealed ? 'password' : 'text'}
                                    placeholder="value"
                                    value={v.value}
                                    onChange={(e) =>
                                      handleUpdateVariable(idx, { value: e.target.value })
                                    }
                                    className="w-full bg-transparent text-slate-200 focus:outline-none"
                                  />
                                  {v.isSecret && (
                                    <button
                                      type="button"
                                      onClick={() => toggleSecretMask(v.id)}
                                      className="text-slate-500 hover:text-slate-300"
                                    >
                                      {isRevealed ? (
                                        <EyeOff className="w-3.5 h-3.5" />
                                      ) : (
                                        <Eye className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={v.isSecret}
                                  onChange={(e) =>
                                    handleUpdateVariable(idx, { isSecret: e.target.checked })
                                  }
                                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => handleDeleteVariable(idx)}
                                  className="text-slate-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Select or create an environment on the left
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-postty-border bg-postty-sidebar flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-postty-card transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
