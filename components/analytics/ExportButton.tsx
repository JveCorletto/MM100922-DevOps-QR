'use client';

import { useState } from 'react';

interface ExportButtonProps {
  surveyId: string;
}

export function ExportButton({ surveyId }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    try {
      setExporting(true);
      setExportFormat(format);
      setErrorMessage(null);
      setShowMenu(false);
      
      const response = await fetch(`/api/surveys/${surveyId}/analytics/export?format=${format}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': format === 'json' ? 'application/json' : 'text/csv',
        }
      });
      
      if (!response.ok) {
        // Intentar obtener mensaje de error del body
        let errorText = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
          if (errorData.details) {
            errorText += `: ${errorData.details}`;
          }
        } catch (e) {
          // Si no se puede parsear como JSON, obtener como texto
          errorText = await response.text();
        }
        
        throw new Error(errorText);
      }
      
      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `encuesta_${surveyId}_${new Date().toISOString().split('T')[0]}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match && match[1]) {
          fileName = match[1];
        }
      } else {
        // Si no hay header, agregar extensión basada en formato
        fileName += format === 'json' ? '.json' : '.csv';
      }
      
      // Obtener el blob de datos
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Crear enlace para descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Limpiar después de un tiempo
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Export error:', error);
      
      let errorMessage = 'Error al exportar los datos';
      if (error instanceof Error) {
        const errMsg = error.message.toLowerCase();
        
        if (errMsg.includes('no autorizado') || errMsg.includes('401')) {
          errorMessage = 'No tienes permiso para exportar esta encuesta. Por favor, inicia sesión.';
        } else if (errMsg.includes('no encontrada') || errMsg.includes('404')) {
          errorMessage = 'Encuesta no encontrada o no tienes respuestas para exportar.';
        } else if (errMsg.includes('no hay respuestas')) {
          errorMessage = 'Esta encuesta no tiene respuestas para exportar.';
        } else if (errMsg.includes('formato no soportado')) {
          errorMessage = 'Formato de exportación no soportado.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrorMessage(errorMessage);
      
      // Mostrar alerta solo para errores críticos
      if (!errorMessage.includes('no hay respuestas')) {
        setTimeout(() => {
          alert(errorMessage);
        }, 100);
      }
      
    } finally {
      setExporting(false);
      setExportFormat(null);
    }
  };

  const getExportButtonText = () => {
    if (exporting && exportFormat) {
      return `Exportando ${exportFormat.toUpperCase()}...`;
    }
    return 'Exportar Datos';
  };

  const getExportButtonIcon = () => {
    if (exporting) {
      return (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        </div>
      );
    }
    return <span className="mr-2">📥</span>;
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (!exporting) {
            setShowMenu(!showMenu);
          }
        }}
        disabled={exporting}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {getExportButtonIcon()}
        <span>{getExportButtonText()}</span>
      </button>
      
      {/* Mensaje de error */}
      {errorMessage && !showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-red-50 border border-red-200 rounded-lg p-3 z-20">
          <div className="flex items-start">
            <span className="text-red-600 mr-2">⚠️</span>
            <div>
              <p className="text-sm text-red-800 font-medium">{errorMessage}</p>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs text-red-600 hover:text-red-800 mt-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Menú de opciones */}
      {showMenu && !exporting && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700">Formato de exportación</p>
            </div>
            
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">📊</span>
                <span>CSV para Excel</span>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">.csv</span>
            </button>
            
            <button
              onClick={() => handleExport('json')}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center">
                <span className="text-green-600 mr-2">📄</span>
                <span>JSON completo</span>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">.json</span>
            </button>
            
            <div className="border-t border-gray-100 mt-1 pt-1">
              <div className="px-4 py-2">
                <p className="text-xs text-gray-500">
                  Los datos se descargarán automáticamente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay para cerrar menú */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}