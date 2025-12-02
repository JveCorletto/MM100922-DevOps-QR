'use client';

import { useEffect, useRef } from 'react';

interface WordCloudProps {
  words: Array<{
    word: string;
    count: number;
  }>;
  width?: number;
  height?: number;
}

export function WordCloud({ words, width = 800, height = 400 }: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || words.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Normalizar los conteos
    const maxCount = Math.max(...words.map(w => w.count));
    const minCount = Math.min(...words.map(w => w.count));
    
    // Colores para la nube
    const colors = [
      '#3B82F6', // Azul
      '#10B981', // Verde
      '#F59E0B', // Ámbar
      '#EF4444', // Rojo
      '#8B5CF6', // Púrpura
      '#EC4899', // Rosa
    ];

    // Configuración
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 50;
    const placedWords: Array<{x: number, y: number, radius: number}> = [];

    // Función para detectar colisiones
    const hasCollision = (x: number, y: number, radius: number) => {
      for (const placed of placedWords) {
        const dx = x - placed.x;
        const dy = y - placed.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < radius + placed.radius + 5) { // +5 padding
          return true;
        }
      }
      return false;
    };

    // Ordenar palabras por frecuencia (mayor primero)
    const sortedWords = [...words].sort((a, b) => b.count - a.count);

    // Colocar palabras
    sortedWords.slice(0, 50).forEach((wordObj, index) => {
      const size = 12 + ((wordObj.count - minCount) / (maxCount - minCount)) * 36;
      const fontSize = Math.max(14, Math.min(50, size));
      
      // Calcular radio aproximado de la palabra
      ctx.font = `${fontSize}px Arial`;
      const textWidth = ctx.measureText(wordObj.word).width;
      const textHeight = fontSize;
      const radius = Math.sqrt(textWidth * textWidth + textHeight * textHeight) / 2;

      // Intentar colocar la palabra
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        attempts++;
        
        // Posición espiral para mejor distribución
        const angle = Math.random() * 2 * Math.PI;
        const distance = (attempts / maxAttempts) * maxRadius;
        
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        // Verificar colisiones
        if (!hasCollision(x, y, radius)) {
          // Dibujar la palabra
          const colorIndex = Math.floor((wordObj.count / maxCount) * (colors.length - 1));
          ctx.fillStyle = colors[colorIndex];
          ctx.font = `bold ${fontSize}px Arial`;
          
          // Añadir sombra para mejor legibilidad
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          ctx.fillText(wordObj.word, x - textWidth / 2, y + textHeight / 4);
          
          // Restaurar sombra
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Registrar palabra colocada
          placedWords.push({ x, y, radius });
          placed = true;
        }
      }

      // Si no se pudo colocar, intentar posición aleatoria
      if (!placed) {
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * (width - 100) + 50;
          const y = Math.random() * (height - 100) + 50;
          
          if (!hasCollision(x, y, radius)) {
            const colorIndex = Math.floor((wordObj.count / maxCount) * (colors.length - 1));
            ctx.fillStyle = colors[colorIndex];
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillText(wordObj.word, x - textWidth / 2, y + textHeight / 4);
            placedWords.push({ x, y, radius });
            break;
          }
        }
      }
    });
  }, [words, width, height]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto border border-gray-200 rounded-lg"
      />
      
      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-sm bg-blue-500 mr-1"></div>
          <span className="text-xs text-gray-600">Menos frecuente</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-sm bg-purple-500 mr-1"></div>
          <span className="text-xs text-gray-600">Frecuente</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-sm bg-red-500 mr-1"></div>
          <span className="text-xs text-gray-600">Muy frecuente</span>
        </div>
      </div>
    </div>
  );
}