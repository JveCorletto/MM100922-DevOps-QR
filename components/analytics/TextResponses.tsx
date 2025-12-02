'use client';

import { useState } from 'react';
import { WordCloud } from './charts/WordCloud';

interface TextResponsesProps {
  data: {
    total_responses: number;
    sample_responses: Array<{
      text: string;
      length: number;
      word_count: number;
    }>;
    word_frequencies: Array<{
      word: string;
      count: number;
    }>;
    average_length: number;
    average_word_count: number;
    shortest_response?: {
      text: string;
      length: number;
    };
    longest_response?: {
      text: string;
      length: number;
    };
  };
  question: string;
}

export function TextResponses({ data, question }: TextResponsesProps) {
  const [viewMode, setViewMode] = useState<'list' | 'cloud' | 'stats'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar respuestas por término de búsqueda
  const filteredResponses = data.sample_responses.filter(response =>
    response.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">Total respuestas</p>
          <p className="text-3xl font-bold text-blue-900">{data.total_responses}</p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <p className="text-sm text-green-800 font-medium">Palabras promedio</p>
          <p className="text-3xl font-bold text-green-900">{data.average_word_count}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <p className="text-sm text-purple-800 font-medium">Caracteres promedio</p>
          <p className="text-3xl font-bold text-purple-900">{data.average_length}</p>
        </div>
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">Palabras únicas</p>
          <p className="text-3xl font-bold text-amber-900">{data.word_frequencies.length}</p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Lista
          </button>
          <button
            onClick={() => setViewMode('cloud')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'cloud'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ☁️ Nube de palabras
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Estadísticas
          </button>
        </div>
        
        <div className="w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar en respuestas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              🔍
            </div>
          </div>
        </div>
      </div>

      {/* Vista según modo seleccionado */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Respuestas de texto ({filteredResponses.length})</h3>
            <p className="text-sm text-gray-600">Mostrando las últimas respuestas recibidas</p>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredResponses.length > 0 ? (
              filteredResponses.map((response, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-gray-900">{response.text}</p>
                    <div className="flex space-x-2 text-xs text-gray-500 ml-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {response.word_count} palabras
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {response.length} caracteres
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">No hay respuestas que coincidan con la búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'cloud' && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Nube de palabras</h3>
            <p className="text-sm text-gray-600">Palabras más frecuentes en las respuestas</p>
          </div>
          <WordCloud words={data.word_frequencies.slice(0, 50)} />
          <div className="mt-4 text-sm text-gray-600">
            <p>Tamaño = frecuencia • Color = categoría</p>
          </div>
        </div>
      )}

      {viewMode === 'stats' && (
        <div className="space-y-6">
          {/* Palabras más frecuentes */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Palabras más frecuentes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.word_frequencies.slice(0, 24).map((word, index) => (
                <div
                  key={word.word}
                  className={`p-3 rounded-lg border ${
                    index < 5 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{word.word}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      index < 5 ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {word.count}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-blue-500"
                      style={{ 
                        width: `${(word.count / data.word_frequencies[0].count) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Respuestas extremas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Respuesta más corta */}
            {data.shortest_response && (
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Respuesta más corta</h3>
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    {data.shortest_response.length} caracteres
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-gray-900 italic">"{data.shortest_response.text}"</p>
                </div>
              </div>
            )}

            {/* Respuesta más larga */}
            {data.longest_response && (
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Respuesta más larga</h3>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {data.longest_response.length} caracteres
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-gray-900 italic">"{data.longest_response.text}"</p>
                </div>
              </div>
            )}
          </div>

          {/* Distribución de longitud */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Distribución de longitud</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>0-50 caracteres (cortas)</span>
                  <span>
                    {Math.round((data.sample_responses.filter(r => r.length <= 50).length / data.sample_responses.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-400"
                    style={{ 
                      width: `${(data.sample_responses.filter(r => r.length <= 50).length / data.sample_responses.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>51-200 caracteres (medias)</span>
                  <span>
                    {Math.round((data.sample_responses.filter(r => r.length > 50 && r.length <= 200).length / data.sample_responses.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ 
                      width: `${(data.sample_responses.filter(r => r.length > 50 && r.length <= 200).length / data.sample_responses.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>201+ caracteres (largas)</span>
                  <span>
                    {Math.round((data.sample_responses.filter(r => r.length > 200).length / data.sample_responses.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ 
                      width: `${(data.sample_responses.filter(r => r.length > 200).length / data.sample_responses.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}