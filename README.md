# DuckDB Browser

A fully frontend-only Next.js application that uses DuckDB WASM to allow users to query local CSV, Parquet, and Excel files in the browser without uploading them to a server.

## Features

- **Drag & Drop File Upload**: Support for CSV, Parquet, and Excel files
- **Excel Multi-Sheet Import**: Select and import multiple sheets from Excel files as separate tables
- **Automatic Table Generation**: Files are automatically registered as DuckDB tables with unique names
- **File Overwrite & Removal**: Uploading a file with the same name overwrites the previous table; remove files/tables from the UI
- **File Explorer Modal**: Explore file/table metadata (row count, columns, size, etc.) in a modern popup
- **SQL Query Editor**: Monaco Editor with SQL syntax highlighting and auto-completion
- **Modern Results Display**: Paginated table view with sorting and formatting
- **Column Copy**: Easily copy column names (individually or all) from the explorer modal
- **Real-time Processing**: All data processing happens in the browser using WebAssembly
- **Robust BigInt Handling**: Handles large numbers from Parquet/CSV/Excel without serialization errors
- **Dark Mode Support**: Beautiful UI with light and dark theme support
- **No Server Required**: Completely static deployment with no backend dependencies

## Screenshots & Demo

<!-- Add screenshots or animated GIFs here -->
<!-- Example: ![screenshot](public/demo.png) -->
<!-- Demo: https://your-demo-link.com -->

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: DuckDB WASM
- **Editor**: Monaco Editor (VS Code's editor)
- **File Processing**: xlsx for Excel files, built-in CSV/Parquet support

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd duckdb-wasm-browser
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Upload Files**: Drag and drop or click to select CSV, Parquet, or Excel files (multi-sheet supported)
2. **View Tables**: See all registered tables in the "Available Tables" section
3. **Explore Files**: Click the "Explore" button next to any file to view metadata and copy column names
4. **Write Queries**: Use the SQL editor to write queries against your data
5. **View Results**: Results are displayed in a paginated table below the editor
6. **Remove/Overwrite**: Remove tables/files or upload a file with the same name to overwrite

## File Support

- **CSV**: Automatically detected and parsed with DuckDB's CSV reader
- **Parquet**: Native support through DuckDB's Parquet scanner
- **Excel**: Parsed using the xlsx library and inserted as SQL data; multi-sheet import supported

## Query Examples

```sql
-- View all data from a table
SELECT * FROM file_csv_1 LIMIT 10;

-- Basic filtering
SELECT * FROM file_csv_1 WHERE column_name = 'value';

-- Aggregations
SELECT column_name, COUNT(*) as count 
FROM file_csv_1 
GROUP BY column_name;

-- Joins between tables
SELECT a.*, b.column_name 
FROM file_csv_1 a 
JOIN file_parquet_2 b ON a.id = b.id;
```

## Project Structure

```
duckdb-wasm-browser/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles
├── components/
│   ├── FileSelector.tsx    # File upload, explorer modal, drag & drop
│   ├── TableList.tsx       # Display registered tables
│   ├── QueryEditor.tsx     # Monaco Editor for SQL
│   └── ResultTable.tsx     # Paginated results display
├── context/
│   └── DuckDBContext.tsx   # React Context for state management
├── lib/
│   └── duckdb.ts           # DuckDB initialization and helpers
└── package.json
```

## Deployment

This application is designed to be deployed as a static site. You can deploy it to:

- **Vercel**: `vercel --prod`
- **Netlify**: `npm run build && netlify deploy --prod --dir=out`
- **GitHub Pages**: Configure for static export

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may require HTTPS for WebAssembly)

## Performance Considerations

- Large files (>100MB) may cause browser memory issues
- Excel files are processed row-by-row, so very large Excel files may be slow
- DuckDB WASM loads ~10MB of WebAssembly code on first use

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

- [DuckDB](https://duckdb.org/) for the amazing analytical database
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for the styling system
