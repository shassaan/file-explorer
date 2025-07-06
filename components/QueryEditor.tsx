'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useDuckDB } from '../context/DuckDBContext';

interface QueryEditorProps {
  onQueryChange?: (query: string) => void;
}

export default function QueryEditor({ onQueryChange }: QueryEditorProps) {
  const { executeQuery, isQueryRunning, error, clearError, tables } = useDuckDB();
  const [query, setQuery] = useState('');
  const editorRef = useRef<unknown>(null);

  // Set initial query when tables are available
  useEffect(() => {
    if (tables.length > 0 && !query) {
      const initialQuery = `SELECT * FROM ${tables[0].name} LIMIT 10;`;
      setQuery(initialQuery);
      onQueryChange?.(initialQuery);
    }
  }, [tables, query, onQueryChange]);

  // Listen for custom events to set query (from TableList component)
  useEffect(() => {
    const handleSetQuery = (event: CustomEvent) => {
      setQuery(event.detail);
      onQueryChange?.(event.detail);
    };

    window.addEventListener('setQuery', handleSetQuery as EventListener);
    return () => {
      window.removeEventListener('setQuery', handleSetQuery as EventListener);
    };
  }, [onQueryChange]);

  const handleEditorDidMount = (editor: unknown) => {
    editorRef.current = editor;
  };

  const handleQueryChange = (value: string | undefined) => {
    const newQuery = value || '';
    setQuery(newQuery);
    onQueryChange?.(newQuery);
  };

  const handleRunQuery = async () => {
    if (!query.trim()) {
      return;
    }
    await executeQuery(query.trim());
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          SQL Query Editor
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Write your SQL queries here and click &quot;Run Query&quot; to execute them.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearError}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Container */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                SQL Query
              </span>
            </div>
            <button
              onClick={handleRunQuery}
              disabled={isQueryRunning || !query.trim()}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isQueryRunning || !query.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isQueryRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Query
                </>
              )}
            </button>
          </div>
        </div>

        <div className="h-64">
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={query}
            onChange={handleQueryChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: {
                enabled: true
              }
            }}
          />
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          💡 Quick Tips
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Click &quot;Sample&quot; on any table to generate a sample query</li>
          <li>• Use the table names from the Available Tables section</li>
          <li>• DuckDB supports standard SQL with some extensions</li>
          <li>• All processing happens in your browser - no data is uploaded</li>
        </ul>
      </div>
    </div>
  );
} 