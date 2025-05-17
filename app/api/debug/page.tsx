"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function DebugPage() {
  const [schemaInfo, setSchemaInfo] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [loading, setLoading] = useState<{ schema: boolean; migration: boolean }>({
    schema: false,
    migration: false,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchSchemaInfo = async () => {
    setLoading(prev => ({ ...prev, schema: true }));
    setError(null);
    
    try {
      const response = await fetch('/api/debug/schema');
      const data = await response.json();
      setSchemaInfo(data);
    } catch (err) {
      setError('Failed to fetch schema information');
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, schema: false }));
    }
  };

  const runMigration = async () => {
    setLoading(prev => ({ ...prev, migration: true }));
    setError(null);
    setMigrationResult(null);
    
    try {
      const response = await fetch('/api/iqr/setup-migration');
      const data = await response.json();
      setMigrationResult(data);
      
      // Refresh schema info after migration
      await fetchSchemaInfo();
    } catch (err) {
      setError('Failed to run migration');
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, migration: false }));
    }
  };

  useEffect(() => {
    fetchSchemaInfo();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Database Debug & Maintenance</h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Database Schema
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSchemaInfo}
                disabled={loading.schema}
              >
                {loading.schema ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  'Refresh'
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schemaInfo ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tables</h3>
                {schemaInfo.tables.map((table: any, index: number) => (
                  <div key={index} className="border rounded-md p-3">
                    <div className="font-semibold text-md mb-2">{table.table}</div>
                    {table.error ? (
                      <div className="text-red-500">{table.error}</div>
                    ) : (
                      <div className="text-sm max-h-40 overflow-y-auto">
                        {Array.isArray(table.columns) ? (
                          <table className="w-full text-left">
                            <thead>
                              <tr>
                                <th className="pr-4">Column</th>
                                <th className="pr-4">Type</th>
                                <th>Nullable</th>
                              </tr>
                            </thead>
                            <tbody>
                              {table.columns.map((col: any, colIndex: number) => (
                                <tr key={colIndex} className="border-t">
                                  <td className="pr-4 py-1">{col.column_name}</td>
                                  <td className="pr-4 py-1">{col.data_type}</td>
                                  <td className="py-1">{col.is_nullable === 'YES' ? '✓' : '✗'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div>No columns found</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <h3 className="text-lg font-medium mt-6">Constraints</h3>
                {schemaInfo.constraints.map((constraint: any, index: number) => (
                  <div key={index} className="border rounded-md p-3">
                    <div className="font-semibold text-md mb-2">{constraint.table}</div>
                    {constraint.error ? (
                      <div className="text-red-500">{constraint.error}</div>
                    ) : (
                      <div className="text-sm max-h-40 overflow-y-auto">
                        {Array.isArray(constraint.constraints) && constraint.constraints.length > 0 ? (
                          <table className="w-full text-left">
                            <thead>
                              <tr>
                                <th className="pr-4">Name</th>
                                <th className="pr-4">Type</th>
                                <th>Definition</th>
                              </tr>
                            </thead>
                            <tbody>
                              {constraint.constraints.map((con: any, conIndex: number) => (
                                <tr key={conIndex} className="border-t">
                                  <td className="pr-4 py-1">{con.constraint_name}</td>
                                  <td className="pr-4 py-1">{con.constraint_type}</td>
                                  <td className="py-1 break-words">{con.constraint_definition}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div>No constraints found</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : loading.schema ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">Schema information not loaded</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-medium mb-2">Run Database Migrations</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Run migration script to update database schema and fix constraint issues.
                </p>
                <Button
                  onClick={runMigration}
                  disabled={loading.migration}
                  className="w-full"
                >
                  {loading.migration ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Running Migration...
                    </>
                  ) : (
                    'Run Migration'
                  )}
                </Button>

                {migrationResult && (
                  <div className="mt-4">
                    <hr className="my-3 border-t border-gray-200" />
                    <h4 className="text-md font-medium mb-2">Result</h4>
                    <div className="border rounded-md p-3 bg-gray-50">
                      {migrationResult.success ? (
                        <div className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <div>
                            <div className="font-medium">Success</div>
                            <div className="text-sm text-gray-600">{migrationResult.message}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start">
                          <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                          <div>
                            <div className="font-medium">Error</div>
                            <div className="text-sm text-red-500">{migrationResult.error}</div>
                            {migrationResult.details && (
                              <div className="text-xs text-gray-600 mt-1">{migrationResult.details}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 