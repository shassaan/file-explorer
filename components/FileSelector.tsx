'use client';

import React, { useState, useCallback } from 'react';
import { useDuckDB } from '../context/DuckDBContext';
import * as XLSX from 'xlsx';

export default function FileSelector() {
  const { registerFile, isLoading, error, clearError, tables, removeTable } = useDuckDB();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [excelSheetModal, setExcelSheetModal] = useState<{
    file: File;
    sheetNames: string[];
  } | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [exploreModal, setExploreModal] = useState<{
    file: File;
    tableName: string;
    details: null | {
      rowCount: number;
      columns: string[];
      columnCount: number;
      fileSizeMB: string;
    };
    loading: boolean;
    error: string | null;
  } | null>(null);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === 'csv' || ext === 'parquet' || ext === 'xlsx' || ext === 'xls';
    });

    if (validFiles.length === 0) {
      alert('Please select valid files (CSV, Parquet, or Excel)');
      return;
    }

    clearError();

    for (const file of validFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        // Parse Excel and show sheet picker
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        setExcelSheetModal({ file, sheetNames: workbook.SheetNames });
        return; // Only handle one Excel at a time for now
      } else {
        await registerFile(file);
        setSelectedFiles(prev => [...prev, file]);
      }
    }
  }, [registerFile, clearError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  }, [handleFileSelect]);

  // Handle Excel sheet selection
  const handleExcelSheetImport = async () => {
    if (!excelSheetModal) return;
    const { file } = excelSheetModal;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    for (const sheetName of selectedSheets) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length === 0) continue;
      // Create a new File object for each sheet (simulate per-sheet upload)
      const sheetFile = new File([file], `${file.name.replace(/\.[^.]+$/, '')}_${sheetName}.xlsx`, { type: file.type });
      // Pass sheetName to registerFile
      await registerFile(sheetFile, sheetName);
      setSelectedFiles(prev => [...prev, sheetFile]);
    }
    setExcelSheetModal(null);
    setSelectedSheets([]);
  };

  // Remove file/table
  const handleRemoveFile = async (file: File) => {
    // Find the table(s) associated with this file
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const relatedTables = tables.filter(t => t.fileName.startsWith(baseName));
    for (const t of relatedTables) {
      await removeTable(t.name);
    }
    setSelectedFiles(prev => prev.filter(f => f !== file));
  };

  // Explore file/table details
  const handleExploreFile = async (file: File) => {
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const table = tables.find(t => t.fileName === file.name || t.fileName.startsWith(baseName));
    if (!table) return;
    setExploreModal({
      file,
      tableName: table.name,
      details: null,
      loading: true,
      error: null
    });
    try {
      // Get column info
      const describeRes = await executeQueryWithResult(`DESCRIBE ${table.name}`);
      // Robustly extract column names
      let columns: string[] = [];
      if (Array.isArray(describeRes.rows[0])) {
        columns = describeRes.rows.map((row) => String((row as unknown[])[0]));
      } else if (typeof describeRes.rows[0] === 'object' && describeRes.rows[0] !== null) {
        columns = describeRes.rows.map((row) => String((row as Record<string, unknown>)['column_name'] ?? Object.values(row ?? {})[0]));
      }
      // Get row count
      const countRes = await executeQueryWithResult(`SELECT COUNT(*) as cnt FROM ${table.name}`);
      let rowCount = 0;
      if (Array.isArray(countRes.rows[0])) {
        rowCount = Number((countRes.rows[0] as unknown[])[0]);
      } else if (typeof countRes.rows[0] === 'object' && countRes.rows[0] !== null) {
        rowCount = Number((countRes.rows[0] as Record<string, unknown>)['cnt'] ?? Object.values(countRes.rows[0] ?? {})[0]);
      }
      setExploreModal({
        file,
        tableName: table.name,
        details: {
          rowCount,
          columns,
          columnCount: columns.length,
          fileSizeMB: (file.size / 1024 / 1024).toFixed(2)
        },
        loading: false,
        error: null
      });
    } catch (err) {
      setExploreModal({
        file,
        tableName: table.name,
        details: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to get table details'
      });
    }
  };

  // Helper to run a query and get result (not just set context result)
  const executeQueryWithResult = async (sql: string) => {
    // Use the runQuery helper directly from lib/duckdb
    const { runQuery } = await import('../lib/duckdb');
    return runQuery(sql);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Upload Data Files
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Drag and drop or click to select CSV, Parquet, or Excel files to analyze
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

      {/* Drag and Drop Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="text-gray-600 dark:text-gray-400">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Click to upload
              </span>
              <span className="ml-1">or drag and drop</span>
            </label>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              multiple
              accept=".csv,.parquet,.xlsx,.xls"
              className="sr-only"
              onChange={handleFileInputChange}
              disabled={isLoading}
            />
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            CSV, Parquet, Excel files up to 100MB each
          </p>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 rounded-lg flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Initializing...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Excel Sheet Picker Modal */}
      {excelSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Select Sheet(s) to Import</h3>
            <div className="mb-4">
              {excelSheetModal.sheetNames.map(sheet => (
                <label key={sheet} className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedSheets.includes(sheet)}
                    onChange={e => {
                      setSelectedSheets(prev =>
                        e.target.checked
                          ? [...prev, sheet]
                          : prev.filter(s => s !== sheet)
                      );
                    }}
                  />
                  <span className="text-gray-800 dark:text-gray-200">{sheet}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                onClick={() => { setExcelSheetModal(null); setSelectedSheets([]); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                disabled={selectedSheets.length === 0}
                onClick={handleExcelSheetImport}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explore File Modal */}
      {exploreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-gray-200 dark:border-gray-700 relative animate-fade-in">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              onClick={() => setExploreModal(null)}
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center tracking-tight">File/Table Details</h3>
            {exploreModal.loading ? (
              <div className="text-center text-gray-600 dark:text-gray-300 py-8">Loading...</div>
            ) : exploreModal.error ? (
              <div className="text-red-600 dark:text-red-400 text-center py-8">{exploreModal.error}</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">File Name</div>
                  <div className="truncate text-gray-900 dark:text-white" title={exploreModal.file.name}>{exploreModal.file.name}</div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Table Name</div>
                  <div className="truncate text-gray-900 dark:text-white" title={exploreModal.tableName}>{exploreModal.tableName}</div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">File Size</div>
                  <div className="text-gray-900 dark:text-white">{exploreModal.details?.fileSizeMB} MB</div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Row Count</div>
                  <div className="text-gray-900 dark:text-white">{exploreModal.details?.rowCount}</div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Column Count</div>
                  <div className="text-gray-900 dark:text-white">{exploreModal.details?.columnCount}</div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Columns</span>
                    <button
                      className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                      onClick={() => {
                        if (exploreModal.details?.columns) {
                          navigator.clipboard.writeText(exploreModal.details.columns.join(', '));
                        }
                      }}
                    >
                      Copy All
                    </button>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-100 whitespace-pre-wrap select-all">
                    {exploreModal.details?.columns.map((col) => (
                      <div key={col} className="flex items-center group hover:bg-blue-50 dark:hover:bg-blue-900 rounded px-1">
                        <span className="flex-1 break-all">{col}</span>
                        <button
                          className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 transition"
                          title="Copy column name"
                          onClick={() => navigator.clipboard.writeText(col)}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Selected Files
          </h3>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {file.name.split('.').pop()?.toUpperCase()}
                  </span>
                  <button
                    className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 text-xs"
                    onClick={() => handleExploreFile(file)}
                  >
                    Explore
                  </button>
                  <button
                    className="ml-2 px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800 text-xs"
                    onClick={() => handleRemoveFile(file)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 