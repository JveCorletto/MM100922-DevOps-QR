'use client';

import { useState } from 'react';

interface ExportButtonProps {
  surveyId: string;
}

export function ExportButton({ surveyId }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    try {
      setExporting(true);
      
      const response = await fetch(`/api/surveys/${surveyId}/analytics/export?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Error al exportar');
      }
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `encuesta_${surveyId}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        console.log('Data:', data);
        // Implementar descarga de JSON o Excel
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error al exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={() => handleExport('csv')}
        disabled={exporting}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {exporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Exportando...</span>
          </>
        ) : (
          <>
            <span>📥</span>
            <span>Exportar Datos</span>
          </>
        )}
      </button>
      
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border hidden group-hover:block">
        <div className="py-1">
          <button
            onClick={() => handleExport('csv')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>📊</span>
            <span>CSV (Excel)</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>📄</span>
            <span>JSON</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>📈</span>
            <span>Excel avanzado</span>
          </button>
        </div>
      </div>
    </div>
  );
}