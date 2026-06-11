import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, BarChart3, Eye, Download, TrendingUp } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AnalyticsData {
  totalViews: number;
  totalDownloads: number;
  viewsByDay: Array<{ date: string; views: number }>;
  downloadsByFormat: Array<{ format: string; count: number }>;
}

export function ResumeAnalyticsPanel({ profileId }: { profileId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Analytics endpoint may not exist yet — gracefully handle
    apiClient.get<AnalyticsData>(`/profiles/${profileId}/analytics`)
      .then(setData)
      .catch(() => {
        // Provide placeholder data if endpoint isn't available
        setData({
          totalViews: 0,
          totalDownloads: 0,
          viewsByDay: [],
          downloadsByFormat: [],
        });
      })
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">Resume Analytics</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalViews}</p>
              <p className="text-xs text-muted-foreground">Total Views</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Download className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalDownloads}</p>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.downloadsByFormat.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Downloads by Format</p>
          {data.downloadsByFormat.map(({ format, count }) => (
            <div key={format} className="flex items-center justify-between rounded-md border p-2">
              <span className="text-xs font-medium uppercase">{format}</span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      )}

      {data.viewsByDay.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Recent Activity
          </p>
          <div className="flex items-end gap-1 h-16">
            {data.viewsByDay.slice(-14).map(({ date, views }) => {
              const maxViews = Math.max(...data.viewsByDay.map((d) => d.views), 1);
              const height = (views / maxViews) * 100;
              return (
                <div
                  key={date}
                  className="flex-1 bg-primary/20 rounded-t hover:bg-primary/40 transition-colors"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${date}: ${views} views`}
                />
              );
            })}
          </div>
        </div>
      )}

      {data.totalViews === 0 && data.totalDownloads === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No analytics data yet. Export or share your resume to start tracking.
        </p>
      )}
    </div>
  );
}
