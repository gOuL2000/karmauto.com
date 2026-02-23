"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database, RefreshCw } from "lucide-react";
export default function DebugDatabasePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/debug/database", {
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "خطا در بارگذاری داده‌ها");
      }
    } catch (err: any) {
      setError(err.message || "خطا در اتصال به سرور");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">{error}</div>
            <Button onClick={loadData} className="mt-4">
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              مشاهده تمام داده‌های دیتابیس
            </h1>
            <p className="text-muted-foreground mt-1">
              {data?.timestamp && new Date(data.timestamp).toLocaleString("fa-IR")}
            </p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            به‌روزرسانی
          </Button>
        </div>

        {data?.tables && data.tables.length > 0 ? (
          <div className="space-y-6">
            {data.tables.map((tableName: string) => {
              const tableData = data.summary[tableName];
              if (!tableData) return null;

              return (
                <Card key={tableName}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{tableName}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {tableData.rowCount || 0} ردیف
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tableData.error ? (
                      <div className="text-red-600">خطا: {tableData.error}</div>
                    ) : (
                      <>
                        <div className="mb-6">
                          <h3 className="font-semibold mb-3">ساختار جدول:</h3>
                          <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm border-collapse">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="p-3 text-right border-b border-r">نام ستون</th>
                                  <th className="p-3 text-right border-b border-r">نوع داده</th>
                                  <th className="p-3 text-right border-b border-r">Nullable</th>
                                  <th className="p-3 text-right border-b">Key</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tableData.columns?.map((col: any, idx: number) => (
                                  <tr key={idx} className="border-b even:bg-muted/10 hover:bg-muted/30">
                                    <td className="p-3 border-r font-medium">{col.name}</td>
                                    <td className="p-3 border-r text-muted-foreground">{col.type}</td>
                                    <td className="p-3 border-r text-center">
                                      {col.nullable ? (
                                        <span className="text-green-600">✓</span>
                                      ) : (
                                        <span className="text-red-600">✗</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      {col.key && (
                                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                                          {col.key}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {tableData.sampleData && tableData.sampleData.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3">
                              داده‌ها {tableData.hasMore && `(نمایش ${tableData.sampleData.length} از ${tableData.rowCount})`}:
                            </h3>
                            <div className="overflow-x-auto border rounded-lg">
                              <table className="w-full text-sm border-collapse bg-background">
                                <thead className="bg-muted/50">
                                  <tr>
                                    {Object.keys(tableData.sampleData[0]).map((key) => (
                                      <th 
                                        key={key} 
                                        className="p-3 text-right font-semibold border-b border-r last:border-r-0 sticky top-0 bg-muted/50 z-10"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>{key}</span>
                                          <span className="text-xs font-normal text-muted-foreground ml-2">
                                            {tableData.columns?.find((c: any) => c.name === key)?.type || ''}
                                          </span>
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {tableData.sampleData.map((row: any, idx: number) => (
                                    <tr 
                                      key={idx} 
                                      className="border-b hover:bg-muted/30 transition-colors even:bg-muted/10"
                                    >
                                      {Object.entries(row).map(([key, value]) => {
                                        const column = tableData.columns?.find((c: any) => c.name === key);
                                        const isJson = column?.type?.toLowerCase().includes('json');
                                        
                                        return (
                                          <td 
                                            key={key} 
                                            className="p-3 border-r last:border-r-0 align-top"
                                          >
                                            {value === null || value === undefined ? (
                                              <span className="text-muted-foreground italic">NULL</span>
                                            ) : isJson || typeof value === "object" ? (
                                              <details className="cursor-pointer">
                                                <summary className="text-primary hover:underline text-xs">
                                                  نمایش JSON ({typeof value === 'object' ? 'Object' : 'Array'})
                                                </summary>
                                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-w-md">
                                                  {JSON.stringify(value, null, 2)}
                                                </pre>
                                              </details>
                                            ) : String(value).length > 50 ? (
                                              <div className="max-w-xs">
                                                <span className="text-muted-foreground break-words">
                                                  {String(value).substring(0, 50)}
                                                </span>
                                                <details className="mt-1">
                                                  <summary className="text-primary hover:underline text-xs cursor-pointer">
                                                    بیشتر...
                                                  </summary>
                                                  <div className="mt-1 p-2 bg-muted rounded text-xs break-words">
                                                    {String(value)}
                                                  </div>
                                                </details>
                                              </div>
                                            ) : (
                                              <span className="break-words">{String(value)}</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {tableData.rowCount === 0 && (
                          <div className="text-center text-muted-foreground py-8">
                            (هیچ داده‌ای وجود ندارد)
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                هیچ جدولی یافت نشد
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

