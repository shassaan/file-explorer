import { AsyncDuckDB, AsyncDuckDBConnection, selectBundle, DuckDBDataProtocol, ConsoleLogger } from '@duckdb/duckdb-wasm';
import * as XLSX from 'xlsx';

// Helper function to convert BigInt values to serializable types
function convertBigIntValues(data: unknown): unknown {
  if (typeof data === 'bigint') {
    const numValue = Number(data);
    if (Number.isSafeInteger(numValue)) {
      return numValue;
    } else {
      return data.toString();
    }
  }
  
  if (Array.isArray(data)) {
    return data.map(convertBigIntValues);
  }
  
  if (typeof data === 'object' && data !== null) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      converted[key] = convertBigIntValues(value);
    }
    return converted;
  }
  
  return data;
}

// Singleton DuckDB instance and connection
let db: AsyncDuckDB | null = null;
let conn: AsyncDuckDBConnection | null = null;

// Helper to initialize DuckDB WASM
export async function initDuckDB(): Promise<{ db: AsyncDuckDB, conn: AsyncDuckDBConnection }> {
  if (db && conn) return { db, conn };

  try {
    console.log('Initializing DuckDB WASM...');
    
    // Use local bundles for DuckDB WASM
    const bundles = {
      eh: {
        mainModule: '/duckdb/duckdb-eh.wasm',
        mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
        pthreadWorker: null,
      },
      mvp: {
        mainModule: '/duckdb/duckdb-mvp.wasm',
        mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
        pthreadWorker: null,
      },
    };
    
    console.log('Selecting DuckDB bundle...');
    const bundle = await selectBundle(bundles);
    console.log('Selected bundle:', bundle);

    // Create a logger and worker for DuckDB
    const logger = new ConsoleLogger();
    if (!bundle.mainWorker) throw new Error('No mainWorker found in selected DuckDB bundle');
    
    console.log('Creating DuckDB worker...');
    const worker = new Worker(bundle.mainWorker as string);
    
    console.log('Creating AsyncDuckDB instance...');
    db = new AsyncDuckDB(logger, worker);
    
    console.log('Instantiating DuckDB...');
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    
    console.log('Connecting to DuckDB...');
    conn = await db.connect();
    
    console.log('DuckDB initialization complete!');
    return { db, conn };
  } catch (error) {
    console.error('DuckDB initialization failed:', error);
    throw error;
  }
}

// Helper to register a file as a table in DuckDB
export async function registerFileAsTable(
  file: File,
  tableName: string
): Promise<void> {
  if (!db || !conn) throw new Error('DuckDB not initialized');
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  // Register file as a DuckDB table depending on type
  if (ext === 'csv') {
    // For CSV files, use DuckDB's built-in CSV reader
    await db.registerFileHandle(`memory://${file.name}`, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
    await conn.query(
      `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('memory://${file.name}')`
    );
  } else if (ext === 'parquet') {
    // For Parquet files, use DuckDB's built-in Parquet reader
    await db.registerFileHandle(`memory://${file.name}`, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
    
    try {
      // Use a simpler approach - create table as select but handle BigInt conversion
      await conn.query(`
        CREATE TABLE ${tableName} AS 
        SELECT * FROM parquet_scan('memory://${file.name}')
      `);
    } catch (error) {
      console.error('Error creating table from Parquet:', error);
      
             // Fallback: try to create table with explicit BigInt handling
       const schemaResult = await conn.query(`DESCRIBE parquet_scan('memory://${file.name}')`);
       const schemaRows = convertBigIntValues(schemaResult.toArray()) as unknown[][];
      
      // Convert BigInt columns to VARCHAR to avoid serialization issues
      const columns = schemaRows.map((row: unknown[]) => {
        const columnName = row[0] as string;
        const columnType = row[1] as string;
        
        if (columnType.includes('BIGINT') || columnType.includes('HUGEINT')) {
          return `"${columnName}" VARCHAR`;
        }
        return `"${columnName}" ${columnType}`;
      }).join(', ');
      
      await conn.query(`CREATE TABLE ${tableName} (${columns})`);
      
      // Insert with CAST to handle BigInt values
      await conn.query(`
        INSERT INTO ${tableName} 
        SELECT * FROM (
          SELECT * FROM parquet_scan('memory://${file.name}')
        ) t
      `);
    }
  } else if (ext === 'xlsx' || ext === 'xls') {
    // For Excel files, parse with xlsx library and insert data
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Excel file is empty or could not be parsed');
    }
    
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as unknown[][];
    
    // Create table with headers
    const columns = headers.map((header) => 
      `"${header || `column_${headers.indexOf(header)}`}" VARCHAR`
    ).join(', ');
    
    await conn.query(`CREATE TABLE ${tableName} (${columns})`);
    
    // Insert data row by row
    for (const row of rows) {
      if (row.length > 0) {
        const values = row.map((value) => {
          if (value === null || value === undefined) {
            return 'NULL';
          }
          // Escape single quotes and wrap in quotes
          const escapedValue = String(value).replace(/'/g, "''");
          return `'${escapedValue}'`;
        });
        
        // Pad with NULL values if row is shorter than headers
        while (values.length < headers.length) {
          values.push('NULL');
        }
        
        await conn.query(`INSERT INTO ${tableName} VALUES (${values.join(', ')})`);
      }
    }
  } else {
    throw new Error('Unsupported file type');
  }
}

// Helper to run a query and return results
export async function runQuery(sql: string): Promise<{ columns: string[]; rows: unknown[] }> {
  if (!conn) throw new Error('DuckDB connection not initialized');
  const result = await conn.query(sql);
  const columns = result.schema.fields.map((f) => f.name);
  const rows = result.toArray();
  
  // Convert BigInt values to serializable types
  const serializableRows = convertBigIntValues(rows) as unknown[];  
  return { columns, rows: serializableRows };
} 