import React, { useState, useMemo } from 'react';
import { Collection, Environment, HttpResponse, RequestItem } from '@postty/contracts';
import { RequestExecutor, VariableInterpolator } from '@postty/core';
import {
  appendHistory,
  getActiveEnvironmentId,
  getStoredCollections,
  getStoredEnvironments,
  getStoredHistory,
  HistoryItem,
  saveStoredCollections,
  saveStoredEnvironments,
  setActiveEnvironmentId,
} from './storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RequestEditor } from './components/RequestEditor';
import { ResponseViewer } from './components/ResponseViewer';
import { EnvironmentModal } from './components/EnvironmentModal';

export const App: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>(getStoredEnvironments);
  const [activeEnvId, setActiveEnvIdState] = useState<string | null>(getActiveEnvironmentId);

  const initialCols = useMemo(() => getStoredCollections(), []);
  const [collections, setCollections] = useState<Collection[]>(initialCols.collections);
  const [requests, setRequests] = useState<RequestItem[]>(initialCols.requests);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(
    initialCols.requests[0]?.id || null
  );

  const [history, setHistory] = useState<HistoryItem[]>(getStoredHistory);
  const [activeResponse, setActiveResponse] = useState<HttpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);

  const activeRequest = useMemo(
    () => requests.find((r) => r.id === activeRequestId) || requests[0] || null,
    [requests, activeRequestId]
  );

  const activeEnvironment = useMemo(
    () => environments.find((e) => e.id === activeEnvId) || null,
    [environments, activeEnvId]
  );

  const activeVariables = useMemo(() => {
    if (!activeEnvironment) return {};
    return VariableInterpolator.buildLookup(activeEnvironment.variables);
  }, [activeEnvironment]);

  // Request Execution via @postty/core RequestExecutor
  const handleSend = async () => {
    if (!activeRequest) return;
    setIsLoading(true);

    try {
      const executor = new RequestExecutor();
      const response = await executor.execute({
        request: activeRequest,
        variables: activeVariables,
      });

      setActiveResponse(response);
      appendHistory(activeRequest, response);
      setHistory(getStoredHistory());
    } catch (err: any) {
      const errResponse: HttpResponse = {
        statusCode: 0,
        statusText: 'Network / CORS Error',
        headers: {},
        body: `Request failed. If calling an external API without CORS headers from the browser, try using the Desktop client, Terminal TUI (postty), or a local proxy runner.\n\nDetails: ${err.message || err}`,
        sizeBytes: 0,
        timing: { totalDurationMs: 0 },
        timestamp: Date.now(),
      };
      setActiveResponse(errResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChange = (updated: RequestItem) => {
    const newRequests = requests.map((r) => (r.id === updated.id ? updated : r));
    setRequests(newRequests);
  };

  const handleSaveRequest = () => {
    saveStoredCollections(collections, requests);
  };

  const handleSelectRequest = (req: RequestItem) => {
    setActiveRequestId(req.id);
    setActiveResponse(null);
  };

  const handleAddRequest = (collectionId: string) => {
    const newReq: RequestItem = {
      id: crypto.randomUUID(),
      collectionId,
      folderId: null,
      name: `New Request ${requests.length + 1}`,
      method: 'GET',
      url: '{{baseUrl}}/',
      queryParams: [],
      headers: [],
      body: { mode: 'none' },
      auth: { type: 'inherit' },
      preRequestScript: '',
      testScript: '',
      orderIndex: requests.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newRequests = [...requests, newReq];
    setRequests(newRequests);
    setActiveRequestId(newReq.id);
    setActiveResponse(null);
    saveStoredCollections(collections, newRequests);
  };

  const handleAddCollection = () => {
    const newCol: Collection = {
      id: crypto.randomUUID(),
      workspaceId: '00000000-0000-0000-0000-000000000001',
      name: `New Collection ${collections.length + 1}`,
      description: '',
      auth: { type: 'none' },
      preRequestScript: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newCols = [...collections, newCol];
    setCollections(newCols);
    saveStoredCollections(newCols, requests);
  };

  const handleDeleteRequest = (requestId: string) => {
    const newRequests = requests.filter((r) => r.id !== requestId);
    setRequests(newRequests);
    if (activeRequestId === requestId) {
      setActiveRequestId(newRequests[0]?.id || null);
      setActiveResponse(null);
    }
    saveStoredCollections(collections, newRequests);
  };

  const handleSelectEnv = (id: string | null) => {
    setActiveEnvIdState(id);
    setActiveEnvironmentId(id);
  };

  const handleSaveEnvironments = (updated: Environment[]) => {
    setEnvironments(updated);
    saveStoredEnvironments(updated);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-postty-bg text-slate-100 font-sans">
      {/* Top Global Navigation Bar */}
      <Header
        environments={environments}
        activeEnvId={activeEnvId}
        onSelectEnv={handleSelectEnv}
        onOpenEnvModal={() => setIsEnvModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          collections={collections}
          requests={requests}
          history={history}
          activeRequestId={activeRequestId}
          onSelectRequest={handleSelectRequest}
          onAddRequest={handleAddRequest}
          onAddCollection={handleAddCollection}
          onDeleteRequest={handleDeleteRequest}
        />

        {/* Center / Right Content Split */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {activeRequest ? (
            <>
              {/* Request Configurator (Left / Top) */}
              <section className="flex-1 flex flex-col min-w-[380px] border-r border-postty-border overflow-hidden">
                <RequestEditor
                  request={activeRequest}
                  onChange={handleRequestChange}
                  onSend={handleSend}
                  onSave={handleSaveRequest}
                  isLoading={isLoading}
                />
              </section>

              {/* Response Inspector (Right / Bottom) */}
              <section className="flex-1 flex flex-col min-w-[380px] overflow-hidden">
                <ResponseViewer
                  response={activeResponse}
                  isLoading={isLoading}
                />
              </section>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs gap-2">
              <p>No request selected.</p>
              <button
                onClick={() => collections[0] && handleAddRequest(collections[0].id)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
              >
                Create Request
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Environment Management Modal */}
      <EnvironmentModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        environments={environments}
        onSaveEnvironments={handleSaveEnvironments}
        activeEnvId={activeEnvId}
      />
    </div>
  );
};
