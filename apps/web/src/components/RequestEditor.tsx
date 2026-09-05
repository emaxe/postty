import React, { useState } from 'react';
import {
  AuthConfig,
  HttpMethod,
  KeyValueParam,
  RequestBody,
  RequestItem,
} from '@postty/contracts';
import { Send, Save, Plus, Trash2, Loader2, Key, Sliders, FileText, Lock } from 'lucide-react';

interface RequestEditorProps {
  request: RequestItem;
  onChange: (updated: RequestItem) => void;
  onSend: () => void;
  onSave: () => void;
  isLoading: boolean;
}

type EditorTab = 'params' | 'headers' | 'auth' | 'body';

export const RequestEditor: React.FC<RequestEditorProps> = ({
  request,
  onChange,
  onSend,
  onSave,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('params');

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  const handleMethodChange = (method: HttpMethod) => {
    onChange({ ...request, method });
  };

  const handleUrlChange = (url: string) => {
    onChange({ ...request, url });
  };

  const handleNameChange = (name: string) => {
    onChange({ ...request, name });
  };

  // Params Handlers
  const addParam = () => {
    const newParam: KeyValueParam = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
    };
    onChange({ ...request, queryParams: [...request.queryParams, newParam] });
  };

  const updateParam = (index: number, updates: Partial<KeyValueParam>) => {
    const updated = [...request.queryParams];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...request, queryParams: updated });
  };

  const deleteParam = (index: number) => {
    const updated = request.queryParams.filter((_, i) => i !== index);
    onChange({ ...request, queryParams: updated });
  };

  // Headers Handlers
  const addHeader = () => {
    const newHeader: KeyValueParam = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
    };
    onChange({ ...request, headers: [...request.headers, newHeader] });
  };

  const updateHeader = (index: number, updates: Partial<KeyValueParam>) => {
    const updated = [...request.headers];
    updated[index] = { ...updated[index], ...updates };
    onChange({ ...request, headers: updated });
  };

  const deleteHeader = (index: number) => {
    const updated = request.headers.filter((_, i) => i !== index);
    onChange({ ...request, headers: updated });
  };

  // Body Handlers
  const handleBodyModeChange = (mode: RequestBody['mode']) => {
    if (mode === 'none') {
      onChange({ ...request, body: { mode: 'none' } });
    } else if (mode === 'raw') {
      onChange({
        ...request,
        body: { mode: 'raw', raw: '{\n  \n}', language: 'json' },
      });
    } else if (mode === 'urlencoded') {
      onChange({ ...request, body: { mode: 'urlencoded', urlencoded: [] } });
    }
  };

  const handleRawBodyChange = (raw: string) => {
    if (request.body.mode === 'raw') {
      onChange({ ...request, body: { ...request.body, raw } });
    }
  };

  // Auth Handlers
  const handleAuthTypeChange = (type: AuthConfig['type']) => {
    if (type === 'none') onChange({ ...request, auth: { type: 'none' } });
    else if (type === 'bearer') onChange({ ...request, auth: { type: 'bearer', token: '' } });
    else if (type === 'basic') onChange({ ...request, auth: { type: 'basic', username: '', password: '' } });
    else if (type === 'apiKey') onChange({ ...request, auth: { type: 'apiKey', key: '', value: '', addTo: 'header' } });
    else if (type === 'inherit') onChange({ ...request, auth: { type: 'inherit' } });
  };

  return (
    <div className="flex flex-col h-full bg-postty-bg border-b border-postty-border">
      {/* Title & Actions Bar */}
      <div className="px-4 py-2 border-b border-postty-border flex items-center justify-between bg-postty-card/50">
        <input
          type="text"
          value={request.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Request name..."
          className="bg-transparent text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
        />
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 transition-colors"
        >
          <Save className="w-3.5 h-3.5 text-indigo-400" />
          <span>Save</span>
        </button>
      </div>

      {/* URL & Method & Send Bar */}
      <div className="p-4 flex items-center gap-2">
        {/* Method Select */}
        <div className="relative">
          <select
            value={request.method}
            onChange={(e) => handleMethodChange(e.target.value as HttpMethod)}
            className="bg-postty-card border border-postty-border rounded-l-md px-3 py-2 text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500 cursor-pointer h-10"
          >
            {methods.map((m) => (
              <option key={m} value={m} className="bg-postty-card text-white">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* URL Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={request.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                onSend();
              }
            }}
            placeholder="Enter request URL (e.g. {{baseUrl}}/api/v1/users)"
            className="w-full bg-postty-card border border-postty-border px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 h-10 transition-colors"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={onSend}
          disabled={isLoading || !request.url.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-r-md h-10 transition-colors shadow-lg shadow-indigo-600/20"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>Send</span>
        </button>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-postty-border px-4 gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('params')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'params'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Params ({request.queryParams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('headers')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'headers'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Headers ({request.headers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('auth')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'auth'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Auth</span>
        </button>

        <button
          onClick={() => setActiveTab('body')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'body'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Body</span>
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* PARAMS */}
        {activeTab === 'params' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Query Parameters</span>
              <button
                onClick={addParam}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Param
              </button>
            </div>

            <div className="border border-postty-border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-postty-card border-b border-postty-border text-slate-400">
                  <tr>
                    <th className="w-8 p-2 text-center">✓</th>
                    <th className="p-2">Key</th>
                    <th className="p-2">Value</th>
                    <th className="p-2">Description</th>
                    <th className="w-8 p-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-postty-border">
                  {request.queryParams.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                        No query parameters. Click "Add Param" to append to URL.
                      </td>
                    </tr>
                  ) : (
                    request.queryParams.map((param, idx) => (
                      <tr key={param.id} className="hover:bg-postty-card/50">
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={param.enabled}
                            onChange={(e) => updateParam(idx, { enabled: e.target.checked })}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Key"
                            value={param.key}
                            onChange={(e) => updateParam(idx, { key: e.target.value })}
                            className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Value"
                            value={param.value}
                            onChange={(e) => updateParam(idx, { value: e.target.value })}
                            className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Description"
                            value={param.description || ''}
                            onChange={(e) => updateParam(idx, { description: e.target.value })}
                            className="w-full bg-transparent text-slate-400 focus:outline-none"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => deleteParam(idx)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HEADERS */}
        {activeTab === 'headers' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Request Headers</span>
              <button
                onClick={addHeader}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Header
              </button>
            </div>

            <div className="border border-postty-border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-postty-card border-b border-postty-border text-slate-400">
                  <tr>
                    <th className="w-8 p-2 text-center">✓</th>
                    <th className="p-2">Key</th>
                    <th className="p-2">Value</th>
                    <th className="w-8 p-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-postty-border">
                  {request.headers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                        No custom headers specified.
                      </td>
                    </tr>
                  ) : (
                    request.headers.map((h, idx) => (
                      <tr key={h.id} className="hover:bg-postty-card/50">
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={h.enabled}
                            onChange={(e) => updateHeader(idx, { enabled: e.target.checked })}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Header name (e.g. Accept)"
                            value={h.key}
                            onChange={(e) => updateHeader(idx, { key: e.target.value })}
                            className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Value"
                            value={h.value}
                            onChange={(e) => updateHeader(idx, { value: e.target.value })}
                            className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => deleteHeader(idx)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUTH */}
        {activeTab === 'auth' && (
          <div className="space-y-4 max-w-xl text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 w-24">Type:</span>
              <select
                value={request.auth.type}
                onChange={(e) => handleAuthTypeChange(e.target.value as AuthConfig['type'])}
                className="bg-postty-card border border-postty-border rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="inherit">Inherit auth from parent</option>
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apiKey">API Key</option>
              </select>
            </div>

            {request.auth.type === 'bearer' && (
              <div className="space-y-2">
                <label className="text-slate-400">Token:</label>
                <input
                  type="text"
                  placeholder="Bearer token (supports {{token}})"
                  value={request.auth.token}
                  onChange={(e) =>
                    onChange({ ...request, auth: { type: 'bearer', token: e.target.value } })
                  }
                  className="w-full bg-postty-card border border-postty-border rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {request.auth.type === 'basic' && (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400">Username:</label>
                  <input
                    type="text"
                    value={request.auth.username}
                    onChange={(e) =>
                      request.auth.type === 'basic' &&
                      onChange({
                        ...request,
                        auth: { ...request.auth, username: e.target.value },
                      })
                    }
                    className="w-full bg-postty-card border border-postty-border rounded px-3 py-1.5 text-slate-200 font-mono mt-1"
                  />
                </div>
                <div>
                  <label className="text-slate-400">Password:</label>
                  <input
                    type="password"
                    value={request.auth.password}
                    onChange={(e) =>
                      request.auth.type === 'basic' &&
                      onChange({
                        ...request,
                        auth: { ...request.auth, password: e.target.value },
                      })
                    }
                    className="w-full bg-postty-card border border-postty-border rounded px-3 py-1.5 text-slate-200 font-mono mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* BODY */}
        {activeTab === 'body' && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="bodyMode"
                  checked={request.body.mode === 'none'}
                  onChange={() => handleBodyModeChange('none')}
                />
                none
              </label>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="bodyMode"
                  checked={request.body.mode === 'raw'}
                  onChange={() => handleBodyModeChange('raw')}
                />
                raw (JSON)
              </label>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="bodyMode"
                  checked={request.body.mode === 'urlencoded'}
                  onChange={() => handleBodyModeChange('urlencoded')}
                />
                x-www-form-urlencoded
              </label>
            </div>

            {request.body.mode === 'raw' && (
              <div className="space-y-2">
                <textarea
                  rows={10}
                  value={request.body.raw}
                  onChange={(e) => handleRawBodyChange(e.target.value)}
                  placeholder="Enter JSON or text payload (variables like {{userId}} supported)..."
                  className="w-full bg-postty-card border border-postty-border rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
