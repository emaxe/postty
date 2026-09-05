import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { HttpResponse, RequestItem } from '@postty/contracts';
import { RequestExecutor, VariableInterpolator } from '@postty/core';

const SAMPLE_REQUESTS: RequestItem[] = [
  {
    id: 'm-req-1',
    collectionId: 'c1',
    folderId: null,
    name: '1. Get Users',
    method: 'GET',
    url: '{{baseUrl}}/users',
    queryParams: [],
    headers: [{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }],
    body: { mode: 'none' },
    auth: { type: 'none' },
    preRequestScript: '',
    testScript: '',
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm-req-2',
    collectionId: 'c1',
    folderId: null,
    name: '2. Get Post #1',
    method: 'GET',
    url: '{{baseUrl}}/posts/1',
    queryParams: [],
    headers: [],
    body: { mode: 'none' },
    auth: { type: 'none' },
    preRequestScript: '',
    testScript: '',
    orderIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm-req-3',
    collectionId: 'c1',
    folderId: null,
    name: '3. Create Post',
    method: 'POST',
    url: '{{baseUrl}}/posts',
    queryParams: [],
    headers: [],
    body: {
      mode: 'raw',
      language: 'json',
      raw: '{"title":"Hello from Mobile Postty","body":"Testing API on iOS/Android","userId":1}',
    },
    auth: { type: 'none' },
    preRequestScript: '',
    testScript: '',
    orderIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const ENVIRONMENTS = [
  { name: 'Development', baseUrl: 'https://jsonplaceholder.typicode.com' },
  { name: 'Production', baseUrl: 'https://api.postty.dev' },
];

export default function App() {
  const [envIndex, setEnvIndex] = useState(0);
  const [selectedReqIndex, setSelectedReqIndex] = useState(0);
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeEnv = ENVIRONMENTS[envIndex];
  const activeReq = SAMPLE_REQUESTS[selectedReqIndex];

  const handleSend = async () => {
    setIsLoading(true);
    try {
      const executor = new RequestExecutor();
      const res = await executor.execute({
        request: activeReq,
        variables: { baseUrl: activeEnv.baseUrl },
      });
      setResponse(res);
    } catch (err: any) {
      setResponse({
        statusCode: 0,
        statusText: 'Error',
        headers: {},
        body: err?.message || 'Network request failed',
        sizeBytes: 0,
        timing: { totalDurationMs: 0 },
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEnv = () => {
    setEnvIndex((prev) => (prev + 1) % ENVIRONMENTS.length);
    setResponse(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1117" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>Postty Mobile</Text>
          <View style={styles.syncBadge}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Cloud Synced</Text>
          </View>
        </View>

        {/* Environment Selector */}
        <TouchableOpacity style={styles.envButton} onPress={toggleEnv}>
          <Text style={styles.envLabel}>Env:</Text>
          <Text style={styles.envName}>{activeEnv.name} ↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Request selector chips */}
        <Text style={styles.sectionTitle}>COLLECTION REQUESTS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {SAMPLE_REQUESTS.map((req, idx) => {
            const isSelected = selectedReqIndex === idx;
            return (
              <TouchableOpacity
                key={req.id}
                onPress={() => {
                  setSelectedReqIndex(idx);
                  setResponse(null);
                }}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={[styles.chipMethod, req.method === 'POST' ? styles.postMethod : styles.getMethod]}>
                  {req.method}
                </Text>
                <Text style={[styles.chipTitle, isSelected && styles.chipTitleActive]}>
                  {req.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Request Card */}
        <View style={styles.card}>
          <View style={styles.requestRow}>
            <Text style={[styles.methodBadge, activeReq.method === 'POST' ? styles.postMethod : styles.getMethod]}>
              {activeReq.method}
            </Text>
            <Text style={styles.urlText} numberOfLines={1}>
              {VariableInterpolator.interpolate(activeReq.url, { baseUrl: activeEnv.baseUrl })}
            </Text>
          </View>

          {activeReq.body.mode === 'raw' && (
            <View style={styles.payloadBox}>
              <Text style={styles.payloadLabel}>Payload:</Text>
              <Text style={styles.payloadText}>{activeReq.body.raw}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send Request</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Response Section */}
        <Text style={styles.sectionTitle}>RESPONSE INSPECTOR</Text>
        <View style={styles.card}>
          {response ? (
            <View>
              <View style={styles.responseMetaRow}>
                <View style={[styles.statusPill, response.statusCode === 200 ? styles.statusSuccess : styles.statusError]}>
                  <Text style={styles.statusPillText}>
                    {response.statusCode} {response.statusText}
                  </Text>
                </View>
                <Text style={styles.metaText}>{response.timing?.totalDurationMs ?? 0} ms</Text>
                <Text style={styles.metaText}>{(response.sizeBytes / 1024).toFixed(2)} KB</Text>
              </View>

              <ScrollView style={styles.responseBodyBox} nestedScrollEnabled>
                <Text style={styles.responseBodyText}>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(response.body), null, 2);
                    } catch {
                      return response.body;
                    }
                  })()}
                </Text>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyResponse}>
              <Text style={styles.emptyResponseText}>
                No response yet. Tap "Send Request" above to test API on mobile.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1117',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2e3d',
    backgroundColor: '#161922',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'column',
  },
  brandText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
    marginRight: 4,
  },
  syncText: {
    fontSize: 10,
    color: '#34d399',
    fontWeight: '600',
  },
  envButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e222d',
    borderWidth: 1,
    borderColor: '#2a2e3d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  envLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginRight: 4,
  },
  envName: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e222d',
    borderWidth: 1,
    borderColor: '#2a2e3d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: {
    borderColor: '#6366f1',
    backgroundColor: '#312e81',
  },
  chipMethod: {
    fontSize: 10,
    fontWeight: '800',
    marginRight: 6,
  },
  getMethod: {
    color: '#34d399',
  },
  postMethod: {
    color: '#fbbf24',
  },
  chipTitle: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  chipTitleActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1e222d',
    borderWidth: 1,
    borderColor: '#2a2e3d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#0f1117',
    marginRight: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: '#f8fafc',
    fontFamily: 'Courier',
  },
  payloadBox: {
    backgroundColor: '#0f1117',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  payloadLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  payloadText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontFamily: 'Courier',
  },
  sendButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  responseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: '#064e3b',
  },
  statusError: {
    backgroundColor: '#7f1d1d',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  responseBodyBox: {
    maxHeight: 300,
    backgroundColor: '#0f1117',
    borderRadius: 8,
    padding: 10,
  },
  responseBodyText: {
    fontSize: 11,
    color: '#e2e8f0',
    fontFamily: 'Courier',
  },
  emptyResponse: {
    padding: 24,
    alignItems: 'center',
  },
  emptyResponseText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
