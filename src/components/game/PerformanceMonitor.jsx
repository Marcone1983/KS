import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import StatsGl from 'stats-gl';

export default function PerformanceMonitor({ visible, onMetricsUpdate }) {
  const statsRef = useRef(null);
  const { gl, scene } = useThree();
  const metricsRef = useRef({
    fps: [],
    drawCalls: [],
    triangles: [],
    startTime: Date.now(),
    logInterval: null
  });

  useEffect(() => {
    if (visible && !statsRef.current) {
      const stats = new StatsGl({
        trackGPU: false,
        trackCPU: true,
        trackHz: true,
        minimal: false,
        mode: 0
      });
      
      stats.init();
      document.body.appendChild(stats.container);
      statsRef.current = stats;
    }

    if (!visible && statsRef.current) {
      statsRef.current.container.remove();
      statsRef.current = null;
    }

    return () => {
      if (statsRef.current) {
        statsRef.current.container.remove();
        statsRef.current = null;
      }
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const info = gl.info;
      const fps = statsRef.current?.fps || 60;
      
      let triangles = 0;
      scene.traverse((obj) => {
        if (obj.geometry) {
          if (obj.geometry.index) {
            triangles += obj.geometry.index.count / 3;
          } else if (obj.geometry.attributes.position) {
            triangles += obj.geometry.attributes.position.count / 3;
          }
        }
      });

      const metrics = {
        fps: Math.round(fps),
        drawCalls: info.render.calls,
        triangles: Math.round(triangles)
      };

      metricsRef.current.fps.push(metrics.fps);
      metricsRef.current.drawCalls.push(metrics.drawCalls);
      metricsRef.current.triangles.push(metrics.triangles);

      if (onMetricsUpdate) {
        onMetricsUpdate(metrics);
      }

      const elapsed = (Date.now() - metricsRef.current.startTime) / 1000;
      if (elapsed >= 60 && metricsRef.current.fps.length > 0) {
        const avgFps = Math.round(metricsRef.current.fps.reduce((a, b) => a + b, 0) / metricsRef.current.fps.length);
        const minFps = Math.min(...metricsRef.current.fps);
        const avgDrawCalls = Math.round(metricsRef.current.drawCalls.reduce((a, b) => a + b, 0) / metricsRef.current.drawCalls.length);
        const avgTriangles = Math.round(metricsRef.current.triangles.reduce((a, b) => a + b, 0) / metricsRef.current.triangles.length);

        console.log('═══════════════════════════════════════');
        console.log('📊 PERFORMANCE REPORT (60s)');
        console.log('═══════════════════════════════════════');
        console.log(`FPS:        avg ${avgFps} | min ${minFps}`);
        console.log(`Draw Calls: avg ${avgDrawCalls}`);
        console.log(`Triangles:  avg ${avgTriangles.toLocaleString()}`);
        console.log('═══════════════════════════════════════');

        metricsRef.current.fps = [];
        metricsRef.current.drawCalls = [];
        metricsRef.current.triangles = [];
        metricsRef.current.startTime = Date.now();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, gl, scene, onMetricsUpdate]);

  useEffect(() => {
    if (statsRef.current) {
      statsRef.current.update();
    }
  });

  return null;
}

export function PerformanceOverlay({ metrics, visible }) {
  if (!visible || !metrics) return null;

  return (
    <div className="fixed top-4 left-4 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg font-mono text-sm z-50 pointer-events-none border border-green-500">
      <div className="font-bold text-green-400 mb-2">PERFORMANCE DEBUG</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">FPS:</span>
          <span className={`font-bold ${metrics.fps >= 60 ? 'text-green-400' : metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.fps}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Draw Calls:</span>
          <span className="text-white font-bold">{metrics.drawCalls}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Triangles:</span>
          <span className="text-white font-bold">{metrics.triangles.toLocaleString()}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
        Press D to toggle
      </div>
    </div>
  );
}