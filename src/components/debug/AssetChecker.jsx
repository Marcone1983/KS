import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';

export default function AssetChecker({ assets = ['/models/plant03.glb', '/models/plant04.glb'] }) {
  const [results, setResults] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);

  const checkAsset = async (url) => {
    const t0 = performance.now();
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const t1 = performance.now();
      const contentLength = response.headers.get('content-length');
      const finalUrl = response.url;
      
      return {
        url,
        finalUrl,
        status: response.status,
        ms: Math.round(t1 - t0),
        len: contentLength ? parseInt(contentLength) : null,
        lenFormatted: contentLength ? `${(parseInt(contentLength) / 1024).toFixed(2)} KB` : 'unknown',
        ok: response.ok
      };
    } catch (error) {
      return {
        url,
        status: 'ERROR',
        error: error.message,
        ms: 0,
        ok: false
      };
    }
  };

  const runCheck = async () => {
    setIsChecking(true);
    setResults([]);
    
    setLocationInfo({
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname
    });

    const checkResults = [];
    for (const asset of assets) {
      const result = await checkAsset(asset);
      checkResults.push(result);
    }
    
    setResults(checkResults);
    setIsChecking(false);
  };

  const openAsset = (url) => {
    window.open(url, '_blank');
  };

  return (
    <Card className="bg-gray-900 border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Asset Preflight Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runCheck} 
          disabled={isChecking}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            'Run Asset Check'
          )}
        </Button>

        {locationInfo && (
          <div className="bg-black/50 p-4 rounded-lg space-y-2 text-xs font-mono">
            <div><span className="text-gray-400">Location:</span> {locationInfo.href}</div>
            <div><span className="text-gray-400">Origin:</span> {locationInfo.origin}</div>
            <div><span className="text-gray-400">Pathname:</span> {locationInfo.pathname}</div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-lg border ${
                  result.ok 
                    ? 'bg-green-900/20 border-green-500/30' 
                    : 'bg-red-900/20 border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {result.ok ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                    <span className="font-semibold break-all">{result.url}</span>
                  </div>
                  <Badge className={result.ok ? 'bg-green-600' : 'bg-red-600'}>
                    {result.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {result.finalUrl && result.finalUrl !== result.url && (
                    <div className="bg-black/30 p-2 rounded">
                      <span className="text-gray-400">Final URL:</span>
                      <div className="text-yellow-400 break-all font-mono text-xs mt-1">
                        {result.finalUrl}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-gray-400">Time</div>
                      <div className="font-bold text-cyan-400">{result.ms}ms</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Size</div>
                      <div className="font-bold text-purple-400">{result.lenFormatted || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Content-Length</div>
                      <div className="font-bold text-blue-400">{result.len || 'null'}</div>
                    </div>
                  </div>

                  {result.error && (
                    <div className="bg-red-900/30 p-2 rounded text-red-300">
                      <span className="font-semibold">Error:</span> {result.error}
                    </div>
                  )}

                  <Button
                    onClick={() => openAsset(result.url)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-gray-600 text-white hover:bg-gray-800"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Browser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg text-sm">
            <div className="font-semibold mb-2 text-blue-400">Interpretation:</div>
            <ul className="space-y-1 text-gray-300">
              <li><span className="text-green-400">200:</span> File served correctly ✓</li>
              <li><span className="text-red-400">404:</span> File not found or wrong base path</li>
              <li><span className="text-orange-400">403:</span> Permissions/hosting/rewrite issue</li>
              <li><span className="text-yellow-400">Large time:</span> File too heavy or slow network</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}