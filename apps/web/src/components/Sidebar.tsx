import React, { useState } from 'react';
import { Collection, HttpMethod, RequestItem } from '@postty/contracts';
import { HistoryItem } from '../storage';
import {
  Folder,
  FolderOpen,
  Plus,
  Search,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  Trash2,
} from 'lucide-react';

interface SidebarProps {
  collections: Collection[];
  requests: RequestItem[];
  history: HistoryItem[];
  activeRequestId: string | null;
  onSelectRequest: (request: RequestItem) => void;
  onAddRequest: (collectionId: string) => void;
  onAddCollection: () => void;
  onDeleteRequest: (requestId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  requests,
  history,
  activeRequestId,
  onSelectRequest,
  onAddRequest,
  onAddCollection,
  onDeleteRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections');
  const [search, setSearch] = useState('');
  const [openCollections, setOpenCollections] = useState<Record<string, boolean>>({
    [collections[0]?.id || '']: true,
  });

  const toggleCollection = (id: string) => {
    setOpenCollections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredRequests = requests.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.url.toLowerCase().includes(search.toLowerCase())
  );

  const getMethodBadgeClass = (method: HttpMethod) => {
    switch (method) {
      case 'GET':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40';
      case 'POST':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/40';
      case 'PUT':
        return 'text-blue-400 bg-blue-950/60 border-blue-800/40';
      case 'PATCH':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40';
      case 'DELETE':
        return 'text-rose-400 bg-rose-950/60 border-rose-800/40';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <aside className="w-72 border-r border-postty-border bg-postty-sidebar flex flex-col h-full select-none">
      {/* Search & Tabs */}
      <div className="p-3 border-b border-postty-border space-y-2">
        {/* Navigation Tabs */}
        <div className="flex bg-postty-card p-0.5 rounded-lg border border-postty-border text-xs font-medium">
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
              activeTab === 'collections'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Collections</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-postty-card border border-postty-border rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === 'collections' ? (
          <>
            {/* Header with New Collection button */}
            <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Collections</span>
              <button
                onClick={onAddCollection}
                title="Create Collection"
                className="hover:text-white p-0.5 hover:bg-postty-card rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {collections.map((col) => {
              const colRequests = filteredRequests.filter((r) => r.collectionId === col.id);
              const isOpen = openCollections[col.id];

              return (
                <div key={col.id} className="space-y-0.5">
                  {/* Collection Title Row */}
                  <div
                    onClick={() => toggleCollection(col.id)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:bg-postty-card cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      {isOpen ? (
                        <FolderOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{col.name}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({colRequests.length})</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddRequest(col.id);
                      }}
                      title="Add Request"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-indigo-300 text-slate-400 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Requests within Collection */}
                  {isOpen && (
                    <div className="pl-4 space-y-0.5">
                      {colRequests.length === 0 ? (
                        <div className="px-3 py-1.5 text-[11px] text-slate-500 italic">
                          No requests yet
                        </div>
                      ) : (
                        colRequests.map((req) => {
                          const isActive = activeRequestId === req.id;

                          return (
                            <div
                              key={req.id}
                              onClick={() => onSelectRequest(req)}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer group transition-colors ${
                                isActive
                                  ? 'bg-indigo-950/70 border border-indigo-500/40 text-white font-medium'
                                  : 'text-slate-300 hover:bg-postty-card'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getMethodBadgeClass(
                                    req.method
                                  )}`}
                                >
                                  {req.method}
                                </span>
                                <span className="truncate">{req.name}</span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRequest(req.id);
                                }}
                                title="Delete Request"
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-slate-500 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* History View */
          <div className="space-y-1">
            <div className="px-2 py-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Recent Calls ({history.length})
            </div>
            {history.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No request history yet. Run a request to see it here.
              </div>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onSelectRequest(h.request)}
                  className="p-2 rounded-md bg-postty-card border border-postty-border hover:border-slate-600 cursor-pointer space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getMethodBadgeClass(
                        h.request.method
                      )}`}
                    >
                      {h.request.method}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        h.response.statusCode >= 200 && h.response.statusCode < 300
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {h.response.statusCode} {h.response.statusText}
                    </span>
                  </div>
                  <div className="text-slate-300 font-mono text-[11px] truncate">
                    {h.request.url}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span>{h.response.timing.totalDurationMs}ms</span>
                    <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
