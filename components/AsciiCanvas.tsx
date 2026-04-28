import React, { useRef, useEffect, useState } from 'react';
import { AsciiOptions } from '../types';
import { getAsciiChar } from '../utils/asciiConverter';
import { playStartupSound, playScanSound, startAmbientHum, stopAmbientHum } from '../utils/soundEffects';
import { Camera } from 'lucide-react';

interface AsciiCanvasProps {
  options: AsciiOptions;
}

const CAMERA_PROFILES: MediaStreamConstraints[] = [
  {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: { ideal: 'user' },
    },
  },
  {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
      facingMode: { ideal: 'user' },
    },
  },
  { video: { facingMode: { ideal: 'user' } } },
  { video: true },
];

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const AUTO_LEVEL_LOW_PERCENTILE = 0.03;
const AUTO_LEVEL_HIGH_PERCENTILE = 0.97;

const getPixelLuma = (data: Uint8ClampedArray, cols: number, rows: number, x: number, y: number): number => {
  const sx = Math.max(0, Math.min(cols - 1, x));
  const sy = Math.max(0, Math.min(rows - 1, y));
  const offset = (sy * cols + sx) * 4;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getAutoLevels = (data: Uint8ClampedArray): { low: number; high: number } => {
  const histogram = new Uint32Array(256);
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const luma = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    histogram[luma] += 1;
  }

  const lowTarget = pixelCount * AUTO_LEVEL_LOW_PERCENTILE;
  const highTarget = pixelCount * AUTO_LEVEL_HIGH_PERCENTILE;

  let cumulative = 0;
  let low = 0;
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= lowTarget) {
      low = i;
      break;
    }
  }

  cumulative = 0;
  let high = 255;
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= highTarget) {
      high = i;
      break;
    }
  }

  // Prevent divide-by-zero and avoid over-stretching near-flat frames.
  if (high - low < 28) {
    const mid = (high + low) / 2;
    low = Math.max(0, Math.round(mid - 14));
    high = Math.min(255, Math.round(mid + 14));
  }

  return { low, high };
};

const stylizeBrightness = (
  data: Uint8ClampedArray,
  cols: number,
  rows: number,
  x: number,
  y: number,
  options: AsciiOptions,
  autoLevels: { low: number; high: number }
): number => {
  const rawBase = getPixelLuma(data, cols, rows, x, y);
  const leveledBase = ((rawBase - autoLevels.low) / (autoLevels.high - autoLevels.low)) * 255;
  const base = Math.max(0, Math.min(255, leveledBase));

  // Lightweight edge estimate to improve facial/object contour readability.
  const left = getPixelLuma(data, cols, rows, x - 1, y);
  const right = getPixelLuma(data, cols, rows, x + 1, y);
  const up = getPixelLuma(data, cols, rows, x, y - 1);
  const down = getPixelLuma(data, cols, rows, x, y + 1);
  const edgeStrength = Math.min(255, Math.abs(right - left) + Math.abs(down - up));
  const diagonal = Math.min(
    255,
    Math.abs(getPixelLuma(data, cols, rows, x - 1, y - 1) - getPixelLuma(data, cols, rows, x + 1, y + 1)) +
      Math.abs(getPixelLuma(data, cols, rows, x + 1, y - 1) - getPixelLuma(data, cols, rows, x - 1, y + 1))
  );
  const edgeComposite = Math.min(255, edgeStrength * 0.75 + diagonal * 0.25);

  // Local unsharp mask effect for stronger feature separation.
  const localMean = (left + right + up + down + base * 4) / 8;
  const sharpenedBase = Math.max(0, Math.min(255, base + (base - localMean) * 1.2));

  // Edge energy lifts dense glyph usage around contours without flooding flat regions.
  let brightness = sharpenedBase * 0.88 + edgeComposite * 0.28;

  // Mild center-upper focus boost where faces typically appear in camera framing.
  const nx = cols > 1 ? x / (cols - 1) : 0.5;
  const ny = rows > 1 ? y / (rows - 1) : 0.5;
  const dx = nx - 0.5;
  const dy = ny - 0.42;
  const radial = Math.sqrt(dx * dx + dy * dy);
  const focusBoost = Math.max(0, 1 - radial / 0.55);
  brightness += focusBoost * 18;

  // Correct contrast model around middle gray.
  const normalized = brightness / 255;
  brightness = ((normalized - 0.5) * options.contrast + 0.5) * 255;

  // Ordered dithering adds texture similar to halftone ASCII renders.
  const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16;
  brightness += (threshold - 0.5) * 8;

  // Subtle scanline modulation to avoid flat fills.
  brightness *= y % 2 === 0 ? 1.0 : 0.93;

  // Gain + slight gamma compression for smoother highlights.
  brightness *= options.brightness;
  brightness = 255 * Math.pow(Math.max(0, Math.min(1, brightness / 255)), 0.9);

  return Math.max(0, Math.min(255, brightness));
};

export const AsciiCanvas: React.FC<AsciiCanvasProps> = ({ options }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null); // For processing pixels
  const prevFrameRef = useRef<Float32Array | null>(null); // Store previous frame for smoothing
  const animationRef = useRef<number>();
  const isMobileRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API is not available on this device/browser.');
        return;
      }

      try {
        for (const profile of CAMERA_PROFILES) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(profile);
            break;
          } catch {
            // Try next profile for broader device support.
          }
        }

        if (!stream) {
          throw new Error('No compatible camera profile');
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video actually plays
          await videoRef.current.play().catch(e => console.error("Play error:", e));
          
          // Play sci-fi startup sound when camera is ready
          playStartupSound();
          // Start the continuous background hum
          startAmbientHum();
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Unable to access camera. Check permissions and use HTTPS/localhost.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      stopAmbientHum();
    };
  }, []);

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
        isMobileRef.current = window.matchMedia('(max-width: 768px)').matches;
        if (canvasRef.current) {
            // Check parent size to avoid scrollbar issues, fallback to window
            const parent = canvasRef.current.parentElement;
            if (parent) {
                canvasRef.current.width = parent.clientWidth;
                canvasRef.current.height = parent.clientHeight;
            } else {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Reset smoothing buffer when dimensions likely change
    prevFrameRef.current = null;
  }, [options.fontSize]);

  useEffect(() => {
    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const hiddenCanvas = hiddenCanvasRef.current;
      
      // Check if video has enough data. readyState >= 2 is HAVE_CURRENT_DATA
      if (!video || !canvas || !hiddenCanvas || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });

      if (!ctx || !hiddenCtx) {
          animationRef.current = requestAnimationFrame(renderLoop);
          return;
      }

      // Determine processing resolution
      const charHeight = options.fontSize;
      ctx.font = `${options.fontSize}px 'JetBrains Mono', monospace`;
      const charWidth = Math.max(1, ctx.measureText('M').width);
      
      const cols = Math.floor(canvas.width / charWidth);
      const rows = Math.floor(canvas.height / charHeight);
      const detailScale = 1 + options.resolution * 2.5;
      const mobileFactor = isMobileRef.current ? 0.82 : 1.0;
      const requestedSourceCols = Math.max(cols, Math.floor(cols * detailScale * mobileFactor));
      const requestedSourceRows = Math.max(rows, Math.floor(rows * detailScale * mobileFactor));
      const maxSourcePixels = isMobileRef.current ? 420_000 : 1_000_000;
      const requestedPixels = requestedSourceCols * requestedSourceRows;
      const pixelScale = requestedPixels > maxSourcePixels
        ? Math.sqrt(maxSourcePixels / requestedPixels)
        : 1;
      const sourceCols = Math.max(cols, Math.floor(requestedSourceCols * pixelScale));
      const sourceRows = Math.max(rows, Math.floor(requestedSourceRows * pixelScale));

      // Safety check for zero dimensions
      if (cols <= 0 || rows <= 0 || sourceCols <= 0 || sourceRows <= 0) {
        animationRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Set hidden canvas size larger than output grid for detail-preserving sampling
      if (hiddenCanvas.width !== sourceCols || hiddenCanvas.height !== sourceRows) {
        hiddenCanvas.width = sourceCols;
        hiddenCanvas.height = sourceRows;
        prevFrameRef.current = null; // Reset smoothing buffer on resize
      }

      // 1. Draw video to small hidden canvas
      // We flip horizontally for a natural mirror effect
      hiddenCtx.save();
      hiddenCtx.translate(sourceCols, 0);
      hiddenCtx.scale(-1, 1);
      hiddenCtx.drawImage(video, 0, 0, sourceCols, sourceRows);
      hiddenCtx.restore();
      
      // 2. Get pixel data
      const frameData = hiddenCtx.getImageData(0, 0, sourceCols, sourceRows);
      const data = frameData.data;

      // --- TEMPORAL SMOOTHING START ---
      // Blend current frame with previous frame to reduce ASCII jitter
      const pixelCount = data.length;
      
      // Initialize buffer if needed
      if (!prevFrameRef.current || prevFrameRef.current.length !== pixelCount) {
        prevFrameRef.current = new Float32Array(pixelCount);
        for(let i=0; i<pixelCount; i++) prevFrameRef.current[i] = data[i];
      }

      const prev = prevFrameRef.current;
      // Smoothing factor: 0.0 = no smoothing, 0.9 = very slow trails. 
      // Lower inertia preserves identity details while reducing jitter.
      const inertia = isMobileRef.current ? 0.52 : 0.45;

      for (let i = 0; i < pixelCount; i++) {
        // Simple Low-pass filter
        // val = prev + (target - prev) * (1 - inertia)
        const target = data[i];
        const current = prev[i];
        const newValue = current + (target - current) * (1 - inertia);
        
        prev[i] = newValue;
        data[i] = newValue; // Update the view for rendering
      }
      // --- TEMPORAL SMOOTHING END ---

      // 3. Clear main canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 4. Setup Font
      ctx.font = `${options.fontSize}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'top';

      const autoLevels = getAutoLevels(data);
      const sourceScaleX = sourceCols / cols;
      const sourceScaleY = sourceRows / rows;

      // 5. Build and Draw ASCII
      if (options.colorMode === 'color') {
          // Full Color Mode
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const sampleX = Math.min(sourceCols - 1, Math.floor((x + 0.5) * sourceScaleX));
                const sampleY = Math.min(sourceRows - 1, Math.floor((y + 0.5) * sourceScaleY));
                const offset = (sampleY * sourceCols + sampleX) * 4;
                const r = data[offset];
                const g = data[offset + 1];
                const b = data[offset + 2];
                const brightness = stylizeBrightness(data, sourceCols, sourceRows, sampleX, sampleY, options, autoLevels);

                const char = getAsciiChar(brightness, options.density);
                
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillText(char, x * charWidth, y * charHeight);
            }
          }
      } else {
          // Monochromatic / Matrix Modes
          if (options.colorMode === 'matrix') ctx.fillStyle = '#00ff41'; // Matrix Green
          else if (options.colorMode === 'retro') ctx.fillStyle = '#ffb000'; // Amber
          else ctx.fillStyle = '#d8d8d8'; // BW

          for (let y = 0; y < rows; y++) {
            let rowText = "";
            for (let x = 0; x < cols; x++) {
                const sampleX = Math.min(sourceCols - 1, Math.floor((x + 0.5) * sourceScaleX));
                const sampleY = Math.min(sourceRows - 1, Math.floor((y + 0.5) * sourceScaleY));
                const brightness = stylizeBrightness(data, sourceCols, sourceRows, sampleX, sampleY, options, autoLevels);

                rowText += getAsciiChar(brightness, options.density);
            }
            ctx.fillText(rowText, 0, y * charHeight);
          }
      }

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    animationRef.current = requestAnimationFrame(renderLoop);

    // Cleanup function to prevent zombie loops when options change
    return () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };
  }, [options]);

  const handleScreenshotClick = () => {
    if (canvasRef.current) {
      playScanSound();
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ascii_art_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-red-500 z-50">
                <p>{error}</p>
            </div>
        )}
        {/* Important: Video must not be display:none for textures to update in some browsers. 
            Using opacity-0 and z-index -1 keeps it in the DOM but invisible. */}
        <video 
            ref={videoRef} 
            className="absolute top-0 left-0 opacity-0 pointer-events-none -z-10 w-1 h-1" 
            playsInline 
            autoPlay 
            muted 
        />
        <canvas ref={hiddenCanvasRef} className="hidden" />
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* Floating Controls Container */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex items-center gap-8 z-40">
            {/* Screenshot Button */}
            <button 
                onClick={handleScreenshotClick}
                className="bg-black/60 hover:bg-green-900/80 text-green-400 border border-green-500/50 p-4 rounded-full backdrop-blur-md transition-all active:scale-95 hover:scale-105 hover:shadow-[0_0_15px_rgba(0,255,0,0.3)]"
                title="Save Snapshot"
            >
                <Camera className="w-6 h-6" />
            </button>
        </div>
    </div>
  );
};
