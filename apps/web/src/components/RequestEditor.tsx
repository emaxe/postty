import React, { useState, useMemo, useRef } from 'react';
import {
  AuthConfig,
  HttpMethod,
  KeyValueParam,
  RequestBody,
  RequestItem,
} from '@postty/contracts';
import {
  Send,
  Save,
  Plus,
  Trash2,
  Loader2,
  Key,
  Sliders,
  FileText,
  Lock,
  Check,
  Copy,
  Code,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  Terminal,
  AlignLeft,
  Minimize2,
} from 'lucide-react';

interface RequestEditorProps {
  request: RequestItem;
  onChange: (updated: RequestItem) => void;
  onSend: () => void;
  onSave: () => void;
  isLoading: boolean;
  onOpenImportModal?: () => void;
}

type EditorTab = 'params' | 'headers' | 'auth' | 'body';

export const RequestEditor: React.FC<RequestEditorProps> = ({
  request,
  onChange,
  onSend,
  onSave,
  isLoading,
  onOpenImportModal,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('params');
  const [paramsBulkMode, setParamsBulkMode] = useState(false);
  const [headersBulkMode, setHeadersBulkMode] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  // ============================================================================
  // URL & Query Params 2-Way Sync
  // ============================================================================

  // When URL is edited in the input bar:
  const handleUrlChange = (newUrl: string) => {
    // If user pastes cURL directly into URL bar, prompt or notify
    if (newUrl.trim().startsWith('curl ') && onOpenImportModal) {
      onOpenImportModal();
      return;
    }

    const qIndex = newUrl.indexOf('?');
    if (qIndex === -1) {
      // URL has no query parameters, but if user cleared query string, clear params
      if (request.queryParams.some((p) => p.enabled && p.key)) {
        onChange({
          ...request,
          url: newUrl,
          queryParams: [],
        });
      } else {
        onChange({ ...request, url: newUrl });
      }
      return;
    }

    const queryString = newUrl.slice(qIndex + 1);
    const searchParams = new URLSearchParams(queryString);
    const updatedParams: KeyValueParam[] = [];

    searchParams.forEach((value, key) => {
      // Preserve existing param ID and description if key matches
      const existing = request.queryParams.find((p) => p.key === key);
      updatedParams.push({
        id: existing?.id || crypto.randomUUID(),
        key,
        value,
        description: existing?.description || '',
        enabled: true,
      });
    });

    onChange({
      ...request,
      url: newUrl,
      queryParams: updatedParams,
    });
  };

  // When Query Params table changes: update queryParams AND sync back to URL
  const updateQueryParamsAndUrl = (newParams: KeyValueParam[]) => {
    const rawUrl = request.url;
    const qIndex = rawUrl.indexOf('?');
    const baseUrl = qIndex !== -1 ? rawUrl.slice(0, qIndex) : rawUrl;

    const searchParams = new URLSearchParams();
    for (const p of newParams) {
      if (p.enabled && p.key) {
        searchParams.append(p.key, p.value);
      }
    }

    const qs = searchParams.toString();
    const finalUrl = qs ? `${baseUrl}?${qs}` : baseUrl;

    onChange({
      ...request,
      url: finalUrl,
      queryParams: newParams,
    });
  };

  // Add param row
  const addParam = () => {
    const newParam: KeyValueParam = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
    };
    updateQueryParamsAndUrl([...request.queryParams, newParam]);
  };

  const updateParam = (index: number, updates: Partial<KeyValueParam>) => {
    const updated = [...request.queryParams];
    updated[index] = { ...updated[index], ...updates };
    updateQueryParamsAndUrl(updated);
  };

  const deleteParam = (index: number) => {
    const updated = request.queryParams.filter((_, i) => i !== index);
    updateQueryParamsAndUrl(updated);
  };

  // Bulk edit params
  const bulkParamsText = useMemo(() => {
    return request.queryParams.map((p) => `${p.enabled ? '' : '# '}${p.key}: ${p.value}`).join('\n');
  }, [request.queryParams]);

  const handleBulkParamsChange = (text: string) => {
    const lines = text.split('\n');
    const parsed: KeyValueParam[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const enabled = !trimmed.startsWith('#');
      const cleanLine = trimmed.replace(/^#\s*/, '');
      const colonIdx = cleanLine.indexOf(':');

      if (colonIdx !== -1) {
        parsed.push({
          id: crypto.randomUUID(),
          key: cleanLine.slice(0, colonIdx).trim(),
          value: cleanLine.slice(colonIdx + 1).trim(),
          enabled,
        });
      } else {
        parsed.push({
          id: crypto.randomUUID(),
          key: cleanLine,
          value: '',
          enabled,
        });
      }
    }

    updateQueryParamsAndUrl(parsed);
  };

  // ============================================================================
  // Headers Handlers
  // ============================================================================

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

  // Preset headers
  const applyJsonHeaders = () => {
    const updated = [...request.headers];
    const hasContentType = updated.some((h) => h.key.toLowerCase() === 'content-type');
    const hasAccept = updated.some((h) => h.key.toLowerCase() === 'accept');

    if (!hasContentType) {
      updated.push({
        id: crypto.randomUUID(),
        key: 'Content-Type',
        value: 'application/json',
        enabled: true,
      });
    }
    if (!hasAccept) {
      updated.push({
        id: crypto.randomUUID(),
        key: 'Accept',
        value: 'application/json',
        enabled: true,
      });
    }
    onChange({ ...request, headers: updated });
  };

  // Bulk edit headers
  const bulkHeadersText = useMemo(() => {
    return request.headers.map((h) => `${h.enabled ? '' : '# '}${h.key}: ${h.value}`).join('\n');
  }, [request.headers]);

  const handleBulkHeadersChange = (text: string) => {
    const lines = text.split('\n');
    const parsed: KeyValueParam[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const enabled = !trimmed.startsWith('#');
      const cleanLine = trimmed.replace(/^#\s*/, '');
      const colonIdx = cleanLine.indexOf(':');

      if (colonIdx !== -1) {
        parsed.push({
          id: crypto.randomUUID(),
          key: cleanLine.slice(0, colonIdx).trim(),
          value: cleanLine.slice(colonIdx + 1).trim(),
          enabled,
        });
      } else {
        parsed.push({
          id: crypto.randomUUID(),
          key: cleanLine,
          value: '',
          enabled,
        });
      }
    }

    onChange({ ...request, headers: parsed });
  };

  // ============================================================================
  // JSON Body Editor, Validation, & Formatting
  // ============================================================================

  const rawBody = request.body.mode === 'raw' ? request.body.raw : '';
  const rawLanguage = request.body.mode === 'raw' ? request.body.language : 'json';

  // Live JSON validation
  const jsonValidation = useMemo<{ isValid: boolean; error: string | null }>(() => {
    if (request.body.mode !== 'raw' || rawLanguage !== 'json' || !rawBody.trim()) {
      return { isValid: true, error: null };
    }

    // Mask template variables like {{foo}} so validator doesn't trip on them
    const sanitized = rawBody.replace(/\{\{[^}]+\}\}/g, '"__VAR__"');
    try {
      JSON.parse(sanitized);
      return { isValid: true, error: null };
    } catch (e: any) {
      return { isValid: false, error: e.message };
    }
  }, [request.body.mode, rawLanguage, rawBody]);

  // Format / Prettify JSON
  const handleBeautifyJson = () => {
    if (request.body.mode !== 'raw') return;
    try {
      // Preserve template variables during JSON formatting
      const varMap: string[] = [];
      const tokenized = request.body.raw.replace(/\{\{[^}]+\}\}/g, (match) => {
        varMap.push(match);
        return `"___VAR_${varMap.length - 1}___"`;
      });

      const parsed = JSON.parse(tokenized);
      let formatted = JSON.stringify(parsed, null, 2);

      // Restore variables
      varMap.forEach((v, idx) => {
        formatted = formatted.replace(`"___VAR_${idx}___"`, v);
      });

      onChange({
        ...request,
        body: { ...request.body, raw: formatted, language: 'json' },
      });
    } catch {
      // If parsing fails as-is, try direct parse
      try {
        const parsed = JSON.parse(request.body.raw);
        onChange({
          ...request,
          body: { ...request.body, raw: JSON.stringify(parsed, null, 2), language: 'json' },
        });
      } catch {}
    }
  };

  // Minify JSON
  const handleMinifyJson = () => {
    if (request.body.mode !== 'raw') return;
    try {
      const parsed = JSON.parse(request.body.raw);
      onChange({
        ...request,
        body: { ...request.body, raw: JSON.stringify(parsed), language: 'json' },
      });
    } catch {}
  };

  // Copy body to clipboard
  const handleCopyBody = () => {
    if (request.body.mode === 'raw') {
      navigator.clipboard.writeText(request.body.raw);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  // Handle Tab key in JSON Editor (insert 2 spaces)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      if (request.body.mode === 'raw') {
        onChange({ ...request, body: { ...request.body, raw: newValue } });
      }

      // Restore cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Line numbers count
  const lineCount = useMemo(() => {
    return rawBody ? rawBody.split('\n').length : 1;
  }, [rawBody]);

  // Body mode switch
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
    } else if (mode === 'form-data') {
      onChange({ ...request, body: { mode: 'form-data', formData: [] } });
    }
  };

  // Auth type switch
  const handleAuthTypeChange = (type: AuthConfig['type']) => {
    if (type === 'none') onChange({ ...request, auth: { type: 'none' } });
    else if (type === 'bearer') onChange({ ...request, auth: { type: 'bearer', token: '' } });
    else if (type === 'basic') onChange({ ...request, auth: { type: 'basic', username: '', password: '' } });
    else if (type === 'apiKey') onChange({ ...request, auth: { type: 'apiKey', key: '', value: '', addTo: 'header' } });
    else if (type === 'inherit') onChange({ ...request, auth: { type: 'inherit' } });
  };

  return (
    <div className="flex flex-col h-full bg-postty-bg border-b border-postty-border">
      {/* Common Header / Value Datalists */}
      <datalist id="common-headers">
        <option value="Accept" />
        <option value="Authorization" />
        <option value="Content-Type" />
        <option value="Cache-Control" />
        <option value="Origin" />
        <option value="User-Agent" />
        <option value="X-API-Key" />
        <option value="X-Request-ID" />
        <option value="Cookie" />
        <option value="Accept-Language" />
        <option value="Accept-Encoding" />
      </datalist>

      <datalist id="common-header-values">
        <option value="application/json" />
        <option value="application/x-www-form-urlencoded" />
        <option value="multipart/form-data" />
        <option value="text/plain" />
        <option value="text/html" />
        <option value="application/xml" />
        <option value="no-cache" />
        <option value="*/*" />
        <option value="gzip, deflate, br" />
      </datalist>

      {/* Title & Actions Bar */}
      <div className="px-4 py-2 border-b border-postty-border flex items-center justify-between bg-postty-card/50">
        <input
          type="text"
          value={request.name}
          onChange={(e) => onChange({ ...request, name: e.target.value })}
          placeholder="Request name..."
          className="bg-transparent text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
        />
        <div className="flex items-center gap-2">
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              title="Import from cURL, Postman, or OpenAPI"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import</span>
            </button>
          )}

          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-indigo-400" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* URL & Method & Send Bar */}
      <div className="p-4 flex items-center gap-2">
        {/* Method Select */}
        <div className="relative">
          <select
            value={request.method}
            onChange={(e) => onChange({ ...request, method: e.target.value as HttpMethod })}
            className="bg-postty-card border border-postty-border rounded-l-md px-3 py-2 text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500 cursor-pointer h-10"
          >
            {methods.map((m) => (
              <option key={m} value={m} className="bg-postty-card text-white font-bold">
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
            placeholder="Enter request URL (e.g. {{baseUrl}}/api/v1/users?limit=10)"
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
      <div className="flex border-b border-postty-border px-4 gap-6 text-xs font-medium bg-postty-card/20">
        <button
          onClick={() => setActiveTab('params')}
          className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'params'
              ? 'border-indigo-500 text-indigo-400 font-bold'
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
              ? 'border-indigo-500 text-indigo-400 font-bold'
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
              ? 'border-indigo-500 text-indigo-400 font-bold'
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
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>
            Body {request.body.mode !== 'none' ? `(${request.body.mode})` : ''}
          </span>
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ===================== PARAMS ===================== */}
        {activeTab === 'params' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="font-medium text-slate-300">Query Parameters</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setParamsBulkMode(!paramsBulkMode)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-700 bg-slate-800/60 transition-colors"
                >
                  <AlignLeft className="w-3 h-3" />
                  <span>{paramsBulkMode ? 'Key-Value Table' : 'Bulk Edit'}</span>
                </button>
                {!paramsBulkMode && (
                  <button
                    onClick={addParam}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Param
                  </button>
                )}
              </div>
            </div>

            {paramsBulkMode ? (
              <div>
                <textarea
                  rows={8}
                  value={bulkParamsText}
                  onChange={(e) => handleBulkParamsChange(e.target.value)}
                  placeholder="key: value&#10;# disabled_key: value"
                  className="w-full bg-slate-950 border border-postty-border rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Prefix a line with # to mark the parameter as disabled.
                </p>
              </div>
            ) : (
              <div className="border border-postty-border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-postty-card border-b border-postty-border text-slate-400 font-semibold">
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
                          No query parameters. Click "Add Param" or edit URL directly.
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
                              className="text-slate-500 hover:text-rose-400 transition-colors"
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
            )}
          </div>
        )}

        {/* ===================== HEADERS ===================== */}
        {activeTab === 'headers' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="font-medium text-slate-300">Request Headers</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={applyJsonHeaders}
                  title="Add Content-Type & Accept: application/json"
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded border border-slate-700 bg-slate-800/60 transition-colors"
                >
                  <Code className="w-3 h-3 text-indigo-400" />
                  <span>+ JSON Headers</span>
                </button>
                <button
                  onClick={() => setHeadersBulkMode(!headersBulkMode)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-700 bg-slate-800/60 transition-colors"
                >
                  <AlignLeft className="w-3 h-3" />
                  <span>{headersBulkMode ? 'Key-Value Table' : 'Bulk Edit'}</span>
                </button>
                {!headersBulkMode && (
                  <button
                    onClick={addHeader}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Header
                  </button>
                )}
              </div>
            </div>

            {headersBulkMode ? (
              <div>
                <textarea
                  rows={8}
                  value={bulkHeadersText}
                  onChange={(e) => handleBulkHeadersChange(e.target.value)}
                  placeholder="Header-Name: Value&#10;# Disabled-Header: Value"
                  className="w-full bg-slate-950 border border-postty-border rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Prefix a line with # to mark the header as disabled.
                </p>
              </div>
            ) : (
              <div className="border border-postty-border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-postty-card border-b border-postty-border text-slate-400 font-semibold">
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
                          No custom headers specified. Click "Add Header" or use presets.
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
                              list="common-headers"
                              placeholder="Header name"
                              value={h.key}
                              onChange={(e) => updateHeader(idx, { key: e.target.value })}
                              className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              list="common-header-values"
                              placeholder="Value"
                              value={h.value}
                              onChange={(e) => updateHeader(idx, { value: e.target.value })}
                              className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => deleteHeader(idx)}
                              className="text-slate-500 hover:text-rose-400 transition-colors"
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
            )}
          </div>
        )}

        {/* ===================== AUTH ===================== */}
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
                <label className="text-slate-400 font-medium">Bearer Token:</label>
                <div className="relative flex items-center">
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Bearer token (supports {{token}})"
                    value={request.auth.token}
                    onChange={(e) =>
                      onChange({ ...request, auth: { type: 'bearer', token: e.target.value } })
                    }
                    className="w-full bg-postty-card border border-postty-border rounded px-3 py-2 pr-10 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 text-slate-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {request.auth.type === 'basic' && (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 font-medium">Username:</label>
                  <input
                    type="text"
                    placeholder="username or {{user}}"
                    value={request.auth.username}
                    onChange={(e) =>
                      request.auth.type === 'basic' &&
                      onChange({
                        ...request,
                        auth: { ...request.auth, username: e.target.value },
                      })
                    }
                    className="w-full bg-postty-card border border-postty-border rounded px-3 py-1.5 text-slate-200 font-mono mt-1 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Password:</label>
                  <div className="relative flex items-center mt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="password or {{pass}}"
                      value={request.auth.password}
                      onChange={(e) =>
                        request.auth.type === 'basic' &&
                        onChange({
                          ...request,
                          auth: { ...request.auth, password: e.target.value },
                        })
                      }
                      className="w-full bg-postty-card border border-postty-border rounded px-3 py-1.5 pr-10 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {request.auth.type === 'apiKey' && (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 font-medium">Key:</label>
                  <input
                    type="text"
                    placeholder="e.g. X-API-Key"
                    value={request.auth.key}
                    onChange={(e) =>
                      request.auth.type === 'apiKey' &&
                      onChange({
                        ...request,
                        auth: { ...request.auth, key: e.target.value },
                      })
                    }
                    className="w-full bg-postty-card border border-postty-border rounded px-3 py-1.5 text-slate-200 font-mono mt-1 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Value:</label>
                  <input
                    type="text"
                    placeholder="API Key value or {{apiKey}}"
                    value={request.auth.value}
                    onChange={(e) =>
                      request.auth.type === 'apiKey' &&
                      onChange({
                        ...request,
                        auth: { ...request.auth, value: e.target.value },
                      })
                    }
                    className="w-full bg-postty-card border border-postty-border rounded px-3 py-1.5 text-slate-200 font-mono mt-1 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-slate-400">Add to:</span>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="addTo"
                      checked={request.auth.addTo === 'header'}
                      onChange={() =>
                        request.auth.type === 'apiKey' &&
                        onChange({ ...request, auth: { ...request.auth, addTo: 'header' } })
                      }
                    />
                    Header
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="addTo"
                      checked={request.auth.addTo === 'query'}
                      onChange={() =>
                        request.auth.type === 'apiKey' &&
                        onChange({ ...request, auth: { ...request.auth, addTo: 'query' } })
                      }
                    />
                    Query Params
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== BODY ===================== */}
        {activeTab === 'body' && (
          <div className="space-y-3 flex flex-col h-full">
            {/* Mode Selector */}
            <div className="flex items-center justify-between text-xs pb-1 border-b border-postty-border/60">
              <div className="flex items-center gap-4">
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
                  raw
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
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyMode"
                    checked={request.body.mode === 'form-data'}
                    onChange={() => handleBodyModeChange('form-data')}
                  />
                  form-data
                </label>
              </div>

              {request.body.mode === 'raw' && (
                <div className="flex items-center gap-2">
                  <select
                    value={rawLanguage}
                    onChange={(e) =>
                      request.body.mode === 'raw' &&
                      onChange({
                        ...request,
                        body: { ...request.body, language: e.target.value as any },
                      })
                    }
                    className="bg-postty-card border border-postty-border rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                  >
                    <option value="json">JSON</option>
                    <option value="text">Text</option>
                    <option value="xml">XML</option>
                    <option value="html">HTML</option>
                    <option value="javascript">JavaScript</option>
                  </select>

                  {rawLanguage === 'json' && (
                    <>
                      <button
                        onClick={handleBeautifyJson}
                        title="Beautify / Format JSON"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>Prettify</span>
                      </button>

                      <button
                        onClick={handleMinifyJson}
                        title="Minify JSON onto one line"
                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
                      >
                        <Minimize2 className="w-3 h-3 text-indigo-400" />
                        <span>Minify</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleCopyBody}
                    title="Copy Body"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
                  >
                    {copiedBody ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBody ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* RAW (JSON/Text) Editor */}
            {request.body.mode === 'raw' && (
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="relative flex border border-postty-border rounded-lg overflow-hidden bg-slate-950 flex-1 min-h-[220px]">
                  {/* Line Numbers Gutter */}
                  <div className="w-9 py-3 bg-slate-900/60 border-r border-slate-800 text-right pr-2 select-none text-[11px] font-mono text-slate-600 leading-relaxed shrink-0">
                    {Array.from({ length: Math.max(lineCount, 8) }).map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  {/* Code Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={rawBody}
                    onChange={(e) =>
                      request.body.mode === 'raw' &&
                      onChange({ ...request, body: { ...request.body, raw: e.target.value } })
                    }
                    onKeyDown={handleEditorKeyDown}
                    placeholder="Enter payload (JSON, text, or template variables like {{userId}})..."
                    spellCheck={false}
                    className="flex-1 bg-transparent p-3 text-xs font-mono text-slate-200 focus:outline-none resize-none leading-relaxed overflow-y-auto"
                  />
                </div>

                {/* Validation Status Footer */}
                {rawLanguage === 'json' && rawBody.trim() && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    {jsonValidation.isValid ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" /> Valid JSON payload
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Invalid JSON: {jsonValidation.error}</span>
                      </span>
                    )}
                    <span className="text-slate-500 font-mono">
                      {rawBody.length} characters • {lineCount} lines
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* URLENCODED Editor */}
            {request.body.mode === 'urlencoded' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>URL-Encoded Parameters</span>
                  <button
                    onClick={() => {
                      if (request.body.mode === 'urlencoded') {
                        const newRow: KeyValueParam = {
                          id: crypto.randomUUID(),
                          key: '',
                          value: '',
                          enabled: true,
                        };
                        onChange({
                          ...request,
                          body: {
                            ...request.body,
                            urlencoded: [...request.body.urlencoded, newRow],
                          },
                        });
                      }
                    }}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>

                <div className="border border-postty-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-postty-card border-b border-postty-border text-slate-400 font-semibold">
                      <tr>
                        <th className="w-8 p-2 text-center">✓</th>
                        <th className="p-2">Key</th>
                        <th className="p-2">Value</th>
                        <th className="w-8 p-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-postty-border">
                      {request.body.urlencoded.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 italic">
                            No urlencoded fields. Click "Add Field".
                          </td>
                        </tr>
                      ) : (
                        request.body.urlencoded.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-postty-card/50">
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(e) => {
                                  if (request.body.mode === 'urlencoded') {
                                    const updated = [...request.body.urlencoded];
                                    updated[idx] = { ...updated[idx], enabled: e.target.checked };
                                    onChange({ ...request, body: { ...request.body, urlencoded: updated } });
                                  }
                                }}
                                className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Key"
                                value={row.key}
                                onChange={(e) => {
                                  if (request.body.mode === 'urlencoded') {
                                    const updated = [...request.body.urlencoded];
                                    updated[idx] = { ...updated[idx], key: e.target.value };
                                    onChange({ ...request, body: { ...request.body, urlencoded: updated } });
                                  }
                                }}
                                className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Value"
                                value={row.value}
                                onChange={(e) => {
                                  if (request.body.mode === 'urlencoded') {
                                    const updated = [...request.body.urlencoded];
                                    updated[idx] = { ...updated[idx], value: e.target.value };
                                    onChange({ ...request, body: { ...request.body, urlencoded: updated } });
                                  }
                                }}
                                className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  if (request.body.mode === 'urlencoded') {
                                    const updated = request.body.urlencoded.filter((_, i) => i !== idx);
                                    onChange({ ...request, body: { ...request.body, urlencoded: updated } });
                                  }
                                }}
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

            {/* FORM-DATA Editor */}
            {request.body.mode === 'form-data' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Multipart Form-Data Fields</span>
                  <button
                    onClick={() => {
                      if (request.body.mode === 'form-data') {
                        const newRow = {
                          id: crypto.randomUUID(),
                          key: '',
                          value: '',
                          type: 'text' as const,
                          enabled: true,
                        };
                        onChange({
                          ...request,
                          body: {
                            ...request.body,
                            formData: [...request.body.formData, newRow],
                          },
                        });
                      }
                    }}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>

                <div className="border border-postty-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-postty-card border-b border-postty-border text-slate-400 font-semibold">
                      <tr>
                        <th className="w-8 p-2 text-center">✓</th>
                        <th className="p-2">Key</th>
                        <th className="w-24 p-2">Type</th>
                        <th className="p-2">Value</th>
                        <th className="w-8 p-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-postty-border">
                      {request.body.formData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                            No form-data fields. Click "Add Field".
                          </td>
                        </tr>
                      ) : (
                        request.body.formData.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-postty-card/50">
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(e) => {
                                  if (request.body.mode === 'form-data') {
                                    const updated = [...request.body.formData];
                                    updated[idx] = { ...updated[idx], enabled: e.target.checked };
                                    onChange({ ...request, body: { ...request.body, formData: updated } });
                                  }
                                }}
                                className="rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Key"
                                value={row.key}
                                onChange={(e) => {
                                  if (request.body.mode === 'form-data') {
                                    const updated = [...request.body.formData];
                                    updated[idx] = { ...updated[idx], key: e.target.value };
                                    onChange({ ...request, body: { ...request.body, formData: updated } });
                                  }
                                }}
                                className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={row.type}
                                onChange={(e) => {
                                  if (request.body.mode === 'form-data') {
                                    const updated = [...request.body.formData];
                                    updated[idx] = { ...updated[idx], type: e.target.value as any };
                                    onChange({ ...request, body: { ...request.body, formData: updated } });
                                  }
                                }}
                                className="bg-postty-card border border-postty-border rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none"
                              >
                                <option value="text">Text</option>
                                <option value="file">File</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder={row.type === 'file' ? 'Path / filename' : 'Value'}
                                value={row.value}
                                onChange={(e) => {
                                  if (request.body.mode === 'form-data') {
                                    const updated = [...request.body.formData];
                                    updated[idx] = { ...updated[idx], value: e.target.value };
                                    onChange({ ...request, body: { ...request.body, formData: updated } });
                                  }
                                }}
                                className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  if (request.body.mode === 'form-data') {
                                    const updated = request.body.formData.filter((_, i) => i !== idx);
                                    onChange({ ...request, body: { ...request.body, formData: updated } });
                                  }
                                }}
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
          </div>
        )}
      </div>
    </div>
  );
};
