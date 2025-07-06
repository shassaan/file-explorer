'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initDuckDB, registerFileAsTable, runQuery } from '../lib/duckdb';

// Types for our context
export interface TableInfo {
  name: string;
  fileType: string;
  fileName: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[];
}

interface DuckDBContextType {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  tables: TableInfo[];
  queryResult: QueryResult | null;
  isQueryRunning: boolean;
  
  // Actions
  initializeDuckDB: () => Promise<void>;
  registerFile: (file: File) => Promise<void>;
  executeQuery: (sql: string) => Promise<void>;
  clearError: () => void;
}

const DuckDBContext = createContext<DuckDBContextType | undefined>(undefined);

export function useDuckDB() {
  const context = useContext(DuckDBContext);
  if (context === undefined) {
    throw new Error('useDuckDB must be used within a DuckDBProvider');
  }
  return context;
}

interface DuckDBProviderProps {
  children: ReactNode;
}

export function DuckDBProvider({ children }: DuckDBProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isQueryRunning, setIsQueryRunning] = useState(false);

  const initializeDuckDB = async () => {
    if (isInitialized) return;
    
    console.log('Starting DuckDB initialization...');
    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize DuckDB and get the connection
      const { db, conn } = await initDuckDB();
      if (db && conn) {
        console.log('DuckDB initialized successfully!');
        setIsInitialized(true);
      } else {
        throw new Error('Failed to get DuckDB connection');
      }
    } catch (err) {
      console.error('DuckDB initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize DuckDB');
    } finally {
      setIsLoading(false);
    }
  };

  const registerFile = async (file: File) => {
    if (!isInitialized) {
      setError('DuckDB not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const tableName = generateTableName(file.name, ext);
      
      await registerFileAsTable(file, tableName);
      
      const newTable: TableInfo = {
        name: tableName,
        fileType: ext,
        fileName: file.name
      };
      
      setTables(prev => [...prev, newTable]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register file');
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuery = async (sql: string) => {
    if (!isInitialized) {
      setError('DuckDB not initialized');
      return;
    }

    setIsQueryRunning(true);
    setError(null);

    try {
      const result = await runQuery(sql);
      setQueryResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
      setQueryResult(null);
    } finally {
      setIsQueryRunning(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Generate unique table names
  const generateTableName = (fileName: string, ext: string): string => {
    const baseName = fileName.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9]/g, '_');
    const tableName = `file_${ext}_${baseName}`;
    
    // Check if table name already exists and add number if needed
    let finalName = tableName;
    let counter = 1;
    
    while (tables.some(t => t.name === finalName)) {
      finalName = `${tableName}_${counter}`;
      counter++;
    }
    
    return finalName;
  };

  const value: DuckDBContextType = {
    isInitialized,
    isLoading,
    error,
    tables,
    queryResult,
    isQueryRunning,
    initializeDuckDB,
    registerFile,
    executeQuery,
    clearError
  };

  return (
    <DuckDBContext.Provider value={value}>
      {children}
    </DuckDBContext.Provider>
  );
} 