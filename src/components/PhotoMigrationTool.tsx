import React, { useState } from 'react';
import { Loader2, ImageDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase';

interface MigrationResult {
  migrated_count: number;
  failed_count: number;
  failed: { table: string; id: string; error: string }[];
  remaining: number;
}

// Safety cap so a genuine bug (e.g. every retry somehow fails without
// reducing "remaining") can't loop this forever — 40 batches at 15 rows
// each covers 600 photos, comfortably more than a small platform needs.
const MAX_BATCHES = 40;

export const PhotoMigrationTool: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [totalMigrated, setTotalMigrated] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [failures, setFailures] = useState<MigrationResult['failed']>([]);
  const [done, setDone] = useState(false);

  const runMigration = async () => {
    setRunning(true);
    setDone(false);
    setTotalMigrated(0);
    setTotalFailed(0);
    setFailures([]);

    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      setRunning(false);
      return;
    }

    let batches = 0;
    let currentRemaining = Infinity;

    try {
      while (currentRemaining > 0 && batches < MAX_BATCHES) {
        const resp = await fetch('/api/migrate-base64-photos', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          console.error('Migration batch failed:', err);
          break;
        }

        const result: MigrationResult = await resp.json();
        setTotalMigrated((prev) => prev + result.migrated_count);
        setTotalFailed((prev) => prev + result.failed_count);
        setFailures((prev) => [...prev, ...result.failed]);
        setRemaining(result.remaining);
        currentRemaining = result.remaining;
        batches++;

        // A batch that touched nothing means we're done, regardless of
        // what "remaining" reports
        if (result.migrated_count === 0 && result.failed_count === 0) break;
      }
    } finally {
      setRunning(false);
      setDone(true);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <ImageDown className="w-4 h-4" /> Migrate Legacy Photos
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        One-time cleanup: converts any photos still stored as base64 text in the database
        into real, cacheable storage files. Safe to run more than once — already-migrated
        photos are automatically skipped.
      </p>

      <Button onClick={runMigration} disabled={running} className="w-full mb-3">
        {running ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Migrating…
          </>
        ) : (
          'Run Migration'
        )}
      </Button>

      {(running || done) && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Migrated</span>
            <span className="font-semibold text-green-600">{totalMigrated}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Failed</span>
            <span className={`font-semibold ${totalFailed > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {totalFailed}
            </span>
          </div>
          {remaining !== null && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Remaining</span>
              <span className="font-semibold text-gray-700">{remaining}</span>
            </div>
          )}

          {done && !running && (
            <div className="flex items-center gap-2 pt-2 text-sm">
              {totalFailed === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">
                    {totalMigrated > 0 ? 'All done — nothing left to migrate.' : 'Nothing to migrate.'}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-700">
                    Finished with {totalFailed} failure(s) — safe to run again to retry them.
                  </span>
                </>
              )}
            </div>
          )}

          {failures.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto bg-red-50 rounded-lg p-2 space-y-1">
              {failures.map((f, i) => (
                <p key={i} className="text-xs text-red-600">
                  {f.table} #{f.id}: {f.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
