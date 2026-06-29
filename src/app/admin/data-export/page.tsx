'use client';

import React, { useState } from 'react';
import { useExportData } from '../../../hooks/useExportData';
import { ExportProgressIndicator } from '../../../components/export/ExportProgressIndicator';

export default function DataExportPage() {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });

  const { state, startExport, abort, reset } = useExportData();

  const handleStartExport = () => {
    startExport('/api/telemetry/export', {
      format,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Data Export
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Export node telemetry data with streaming support
        </p>
      </header>

      <main className="bg-white dark:bg-gray-800 border rounded-xl p-6 shadow-sm">
        {state.status === 'idle' || state.status === 'complete' || state.status === 'aborted' || state.status === 'error' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={() => setFormat('csv')}
                    className="mr-2"
                  />
                  CSV
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={format === 'json'}
                    onChange={() => setFormat('json')}
                    className="mr-2"
                  />
                  JSON
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleStartExport}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Export
              </button>
              {(state.status === 'complete' || state.status === 'aborted' || state.status === 'error') && (
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {state.status === 'error' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md text-red-800 dark:text-red-200">
                {state.error?.message || 'An error occurred during export'}
              </div>
            )}
          </div>
        ) : (
          <ExportProgressIndicator
            progress={state.progress}
            bytesReceived={state.bytesReceived}
            bytesTotal={state.bytesTotal}
            status={state.status}
            usingFallback={state.usingFallback}
            onAbort={abort}
          />
        )}
      </main>
    </div>
  );
}