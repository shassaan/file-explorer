'use client';

import React, { useEffect } from 'react';
import { DuckDBProvider, useDuckDB } from '../context/DuckDBContext';
import FileSelector from '../components/FileSelector';
import TableList from '../components/TableList';
import QueryEditor from '../components/QueryEditor';
import ResultTable from '../components/ResultTable';

function MainContent() {
  const { initializeDuckDB, isInitialized } = useDuckDB();

  useEffect(() => {
    // Initialize DuckDB when the component mounts
    initializeDuckDB();
  }, [initializeDuckDB]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  DuckDB Browser
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analyze CSV, Parquet, and Excel files in your browser
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isInitialized ? 'Ready' : 'Initializing...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* File Upload Section */}
          <FileSelector />
          
          {/* Tables Section */}
          <TableList />
          
          {/* Query Editor Section */}
          <QueryEditor />
          
          {/* Results Section */}
          <ResultTable />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Powered by{' '}
              <a
                href="https://duckdb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                DuckDB
              </a>
              {' '}and{' '}
              <a
                href="https://nextjs.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Next.js
              </a>
            </p>
            <p className="mt-1">
              All processing happens in your browser - no data is uploaded to any server
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <DuckDBProvider>
      <MainContent />
    </DuckDBProvider>
  );
}
