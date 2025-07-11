'use client';

import React, { useState, useMemo } from 'react';
import { useDuckDB } from '../context/DuckDBContext';

const ITEMS_PER_PAGE = 50;

export default function ResultTable() {
  const { queryResult, isQueryRunning } = useDuckDB();
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = useMemo(() => {
    if (!queryResult) return { data: [], totalPages: 0, totalRows: 0 };
    
    const totalRows = queryResult.rows.length;
    const totalPages = Math.ceil(totalRows / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const data = queryResult.rows.slice(startIndex, endIndex);
    
    return { data, totalPages, totalRows };
  }, [queryResult, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isQueryRunning) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg text-gray-600 dark:text-gray-400">
              Running query...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!queryResult) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No results to display
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Run a query to see results here
          </p>
        </div>
      </div>
    );
  }

  const { data, totalPages, totalRows } = paginatedData;

  // --- Export helpers ---
  function exportAsCSV() {
    if (!queryResult) return;
    const { columns, rows } = queryResult;
    const csvRows = [
      columns.join(','),
      ...rows.map(row =>
        columns.map((col, i) => {
          let cell = Array.isArray(row) ? row[i] : row[col];
          if (cell === null || cell === undefined) return '';
          const str = String(cell);
          // Escape quotes and commas
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        }).join(',')
      )
    ];
    const csvContent = csvRows.join('\n');
    downloadFile(csvContent, 'query_result.csv', 'text/csv');
  }

  function exportAsJSON() {
    if (!queryResult) return;
    const { columns, rows } = queryResult;
    // Convert rows to array of objects for JSON
    const data = rows.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = Array.isArray(row) ? row[i] : row[col];
      });
      return obj;
    });
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'query_result.json', 'application/json');
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  // --- End export helpers ---

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Query Results
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {totalRows} row{totalRows !== 1 ? 's' : ''} returned
          {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
        </p>
        {/* Export Buttons */}
        {queryResult && queryResult.rows.length > 0 && (
          <div className="flex gap-2 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              onClick={exportAsCSV}
            >
              Export CSV
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
              onClick={exportAsJSON}
            >
              Export JSON
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 shadow overflow-hidden sm:rounded-lg">
        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {queryResult.columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {queryResult.columns.map((column, colIndex) => {
                    // Handle both array and object row formats
                    let cellValue: unknown;
                    if (Array.isArray(row)) {
                      cellValue = row[colIndex];
                    } else if (typeof row === 'object' && row !== null) {
                      cellValue = (row as Record<string, unknown>)[column];
                    } else {
                      cellValue = row;
                    }
                    
                    return (
                      <td
                        key={colIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                      >
                        <div className="max-w-xs truncate" title={String(cellValue ?? '')}>
                          {formatCellValue(cellValue)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalRows)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{totalRows}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === currentPage
                            ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                      currentPage === totalPages
                        ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format cell values
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // For objects, arrays, etc.
  return JSON.stringify(value);
} 