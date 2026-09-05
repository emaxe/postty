import React, { useState, useId } from 'react';
import { Collection, RequestItem } from '@postty/contracts';
import {
  parseCurlCommand,
  curlToRequestItem,
  parsePostmanCollection,
  parseOpenApiSpec,
} from '@postty/core';
import {
  Terminal,
  FileCode,
  Upload,
  Check,
  AlertCircle,
  X,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  activeCollectionId: string | null;
  activeRequest: RequestItem | null;
  onApplyToCurrentRequest: (updated: Partial<RequestItem>) => void;
  onCreateRequest: (collectionId: string, request: RequestItem) => void;
  onImportCollection: (collection: Collection, requests: RequestItem[]) => void;
}

type ImportTab = 'curl' | 'postman' | 'openapi';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  collections,
  activeCollectionId,
  activeRequest,
  onApplyToCurrentRequest,
  onCreateRequest,
  onImportCollection,
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('curl');
  const [targetCollectionId, setTargetCollectionId] = useState<string>(
    activeCollectionId || collections[0]?.id || ''
  );

  // cURL state
  const [curlInput, setCurlInput] = useState('');
  const [curlError, setCurlError] = useState<string | null>(null);

  // Postman state
  const [postmanInput, setPostmanInput] = useState('');
  const [postmanError, setPostmanError] = useState<string | null>(null);
  const [postmanParsed, setPostmanParsed] = useState<any | null>(null);

  // OpenAPI state
  const [openApiInput, setOpenApiInput] = useState('');
  const [openApiError, setOpenApiError] = useState<string | null>(null);
  const [openApiParsed, setOpenApiParsed] = useState<any | null>(null);

  const fileInputId = useId();

  if (!isOpen) return null;

  // cURL preview
  let parsedCurlPreview: ReturnType<typeof parseCurlCommand> | null = null;
  if (curlInput.trim()) {
    try {
      parsedCurlPreview = parseCurlCommand(curlInput.trim());
    } catch (err: any) {
      // not ready yet
    }
  }

  // Handle cURL import
  const handleApplyCurlToCurrent = () => {
    if (!curlInput.trim()) return;
    try {
      setCurlError(null);
      const parsed = parseCurlCommand(curlInput.trim());
      onApplyToCurrentRequest({
        name: parsed.name,
        method: parsed.method,
        url: parsed.url,
        headers: parsed.headers,
        queryParams: parsed.queryParams,
        body: parsed.body,
        auth: parsed.auth,
      });
      onClose();
    } catch (err: any) {
      setCurlError(err.message || 'Failed to parse cURL command');
    }
  };

  const handleCreateCurlAsNew = () => {
    if (!curlInput.trim() || !targetCollectionId) return;
    try {
      setCurlError(null);
      const newReq = curlToRequestItem(curlInput.trim(), targetCollectionId);
      onCreateRequest(targetCollectionId, newReq);
      onClose();
    } catch (err: any) {
      setCurlError(err.message || 'Failed to parse cURL command');
    }
  };

  // Handle Postman file drop / text change
  const handlePostmanChange = (text: string) => {
    setPostmanInput(text);
    setPostmanError(null);
    setPostmanParsed(null);

    if (!text.trim()) return;

    try {
      const workspaceId = collections[0]?.workspaceId || '00000000-0000-0000-0000-000000000001';
      const result = parsePostmanCollection(text.trim(), workspaceId);
      setPostmanParsed(result);
    } catch (err: any) {
      setPostmanError(err.message || 'Invalid Postman JSON');
    }
  };

  const handleImportPostman = () => {
    if (!postmanParsed) return;
    onImportCollection(postmanParsed.collection, postmanParsed.requests);
    onClose();
  };

  // Handle OpenAPI file drop / text change
  const handleOpenApiChange = (text: string) => {
    setOpenApiInput(text);
    setOpenApiError(null);
    setOpenApiParsed(null);

    if (!text.trim()) return;

    try {
      const workspaceId = collections[0]?.workspaceId || '00000000-0000-0000-0000-000000000001';
      const result = parseOpenApiSpec(text.trim(), workspaceId);
      setOpenApiParsed(result);
    } catch (err: any) {
      setOpenApiError(err.message || 'Invalid OpenAPI/Swagger JSON');
    }
  };

  const handleImportOpenApi = () => {
    if (!openApiParsed) return;
    onImportCollection(openApiParsed.collection, openApiParsed.requests);
    onClose();
  };

  // File Upload reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tab: ImportTab) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (tab === 'postman') {
        handlePostmanChange(content);
      } else if (tab === 'openapi') {
        handleOpenApiChange(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="bg-postty-card border border-postty-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-postty-border flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 id="import-modal-title" className="text-sm font-bold text-white">
                Import to Postty
              </h2>
              <p className="text-[11px] text-slate-400">
                Import from cURL, Postman Collections, or OpenAPI / Swagger specs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-postty-border px-5 gap-6 text-xs font-semibold bg-slate-900/30">
          <button
            onClick={() => setActiveTab('curl')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'curl'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>cURL Command</span>
          </button>

          <button
            onClick={() => setActiveTab('postman')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'postman'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Postman Collection</span>
          </button>

          <button
            onClick={() => setActiveTab('openapi')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'openapi'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>OpenAPI / Swagger</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* ===================== TAB: cURL ===================== */}
          {activeTab === 'curl' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Paste cURL command:
                </label>
                <textarea
                  rows={6}
                  value={curlInput}
                  onChange={(e) => {
                    setCurlInput(e.target.value);
                    setCurlError(null);
                  }}
                  placeholder="curl -X POST https://api.example.com/v1/users -H 'Content-Type: application/json' -d '{&quot;name&quot;: &quot;Alice&quot;}'"
                  className="w-full bg-slate-950 border border-postty-border rounded-lg p-3 font-mono text-slate-200 focus:outline-none focus:border-indigo-500 text-[11px] leading-relaxed"
                />
              </div>

              {curlError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{curlError}</span>
                </div>
              )}

              {/* cURL Live Preview */}
              {parsedCurlPreview && (
                <div className="bg-slate-900/60 border border-postty-border rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                      Parsed Preview
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                      <Check className="w-3.5 h-3.5" /> Valid cURL
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-900/70 border border-indigo-700/50 text-indigo-300 font-bold font-mono text-[10px]">
                      {parsedCurlPreview.method}
                    </span>
                    <span className="font-mono text-slate-200 truncate flex-1">
                      {parsedCurlPreview.url || '<no-url>'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 text-[11px] pt-1">
                    <span>Headers: <strong className="text-slate-200">{parsedCurlPreview.headers.length}</strong></span>
                    <span>Params: <strong className="text-slate-200">{parsedCurlPreview.queryParams.length}</strong></span>
                    <span>Body: <strong className="text-slate-200">{parsedCurlPreview.body.mode}</strong></span>
                    <span>Auth: <strong className="text-slate-200">{parsedCurlPreview.auth.type}</strong></span>
                  </div>
                </div>
              )}

              {/* Target Collection Selection */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-slate-400 font-medium">Add to Collection:</span>
                <select
                  value={targetCollectionId}
                  onChange={(e) => setTargetCollectionId(e.target.value)}
                  className="bg-postty-card border border-postty-border rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ===================== TAB: POSTMAN ===================== */}
          {activeTab === 'postman' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">
                  Paste Postman Collection v2 / v2.1 JSON or upload file:
                </label>
                <label
                  htmlFor={fileInputId}
                  className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[11px] font-medium transition-colors"
                >
                  <Upload className="w-3 h-3 text-indigo-400" />
                  <span>Choose .json file</span>
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileUpload(e, 'postman')}
                  className="hidden"
                />
              </div>

              <textarea
                rows={7}
                value={postmanInput}
                onChange={(e) => handlePostmanChange(e.target.value)}
                placeholder='{ "info": { "name": "My Collection" }, "item": [ ... ] }'
                className="w-full bg-slate-950 border border-postty-border rounded-lg p-3 font-mono text-slate-200 focus:outline-none focus:border-indigo-500 text-[11px] leading-relaxed"
              />

              {postmanError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{postmanError}</span>
                </div>
              )}

              {postmanParsed && (
                <div className="bg-slate-900/60 border border-postty-border rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                      Collection Preview
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                      <Check className="w-3.5 h-3.5" /> Valid Postman Spec
                    </span>
                  </div>

                  <div className="text-white font-bold text-sm">
                    {postmanParsed.collection.name}
                  </div>
                  {postmanParsed.collection.description && (
                    <div className="text-slate-400 text-[11px] line-clamp-2">
                      {postmanParsed.collection.description}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-slate-400 text-[11px] pt-1">
                    <span>Folders: <strong className="text-slate-200">{postmanParsed.folders.length}</strong></span>
                    <span>Total Requests: <strong className="text-indigo-400">{postmanParsed.requests.length}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB: OPENAPI ===================== */}
          {activeTab === 'openapi' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">
                  Paste OpenAPI 3.x / Swagger 2.0 JSON or upload file:
                </label>
                <label
                  htmlFor={`${fileInputId}-openapi`}
                  className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[11px] font-medium transition-colors"
                >
                  <Upload className="w-3 h-3 text-indigo-400" />
                  <span>Choose .json file</span>
                </label>
                <input
                  id={`${fileInputId}-openapi`}
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileUpload(e, 'openapi')}
                  className="hidden"
                />
              </div>

              <textarea
                rows={7}
                value={openApiInput}
                onChange={(e) => handleOpenApiChange(e.target.value)}
                placeholder='{ "openapi": "3.0.0", "info": { "title": "Petstore API" }, "paths": { ... } }'
                className="w-full bg-slate-950 border border-postty-border rounded-lg p-3 font-mono text-slate-200 focus:outline-none focus:border-indigo-500 text-[11px] leading-relaxed"
              />

              {openApiError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{openApiError}</span>
                </div>
              )}

              {openApiParsed && (
                <div className="bg-slate-900/60 border border-postty-border rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                      OpenAPI Preview
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                      <Check className="w-3.5 h-3.5" /> Valid OpenAPI Specification
                    </span>
                  </div>

                  <div className="text-white font-bold text-sm">
                    {openApiParsed.collection.name}
                  </div>
                  {openApiParsed.collection.description && (
                    <div className="text-slate-400 text-[11px] line-clamp-2">
                      {openApiParsed.collection.description}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-slate-400 text-[11px] pt-1">
                    <span>Groups/Tags: <strong className="text-slate-200">{openApiParsed.folders.length}</strong></span>
                    <span>Total Endpoints: <strong className="text-indigo-400">{openApiParsed.requests.length}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-postty-border bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeTab === 'curl' && (
              <>
                {activeRequest && (
                  <button
                    onClick={handleApplyCurlToCurrent}
                    disabled={!curlInput.trim() || !parsedCurlPreview}
                    className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                  >
                    Apply to Active Request
                  </button>
                )}
                <button
                  onClick={handleCreateCurlAsNew}
                  disabled={!curlInput.trim() || !parsedCurlPreview}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create as New Request</span>
                </button>
              </>
            )}

            {activeTab === 'postman' && (
              <button
                onClick={handleImportPostman}
                disabled={!postmanParsed}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Import Postman Collection ({postmanParsed?.requests.length || 0})</span>
              </button>
            )}

            {activeTab === 'openapi' && (
              <button
                onClick={handleImportOpenApi}
                disabled={!openApiParsed}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Import OpenAPI Spec ({openApiParsed?.requests.length || 0})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
