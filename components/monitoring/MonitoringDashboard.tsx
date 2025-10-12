/**
 * Monitoring dashboard component
 * Real-time system monitoring and analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { monitoringDashboard, LogLevel } from '@/lib/monitoring/logger';

interface DashboardData {
  logs: Array<{
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: any;
    error?: any;
  }>;
  performance: Record<string, any>;
  errors: Array<{ error: string; count: number }>;
  activities: {
    totalActivities: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
  };
  health: {
    healthy: boolean;
    checks: Record<string, boolean>;
    timestamp: string;
  };
}

export function MonitoringDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState<
    'logs' | 'performance' | 'errors' | 'activities' | 'health'
  >('logs');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await monitoringDashboard.getDashboardData();
        setData(dashboardData);
      } catch (error) {
        console.error('Failed to fetch monitoring data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-red-600">
        Failed to load monitoring data
      </div>
    );
  }

  const logLevelColors = {
    [LogLevel.DEBUG]: 'text-cyan-600',
    [LogLevel.INFO]: 'text-green-600',
    [LogLevel.WARN]: 'text-yellow-600',
    [LogLevel.ERROR]: 'text-red-600',
    [LogLevel.FATAL]: 'text-purple-600',
  };

  const logLevelNames = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL',
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <div className="mt-2 flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center">
            <div
              className={`mr-2 h-3 w-3 rounded-full ${
                data.health.healthy ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></div>
            <span className="font-medium">System Health</span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {data.health.healthy
              ? 'All systems operational'
              : 'Issues detected'}
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-2xl font-bold text-blue-600">
            {data.activities.totalActivities}
          </div>
          <p className="text-sm text-gray-600">Total Activities</p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-2xl font-bold text-green-600">
            {data.activities.uniqueUsers}
          </div>
          <p className="text-sm text-gray-600">Active Users</p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-2xl font-bold text-red-600">
            {data.errors.length}
          </div>
          <p className="text-sm text-gray-600">Error Types</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'logs', label: 'Logs', count: data.logs.length },
            {
              id: 'performance',
              label: 'Performance',
              count: Object.keys(data.performance).length,
            },
            { id: 'errors', label: 'Errors', count: data.errors.length },
            {
              id: 'activities',
              label: 'Activities',
              count: data.activities.totalActivities,
            },
            {
              id: 'health',
              label: 'Health',
              count: Object.keys(data.health.checks).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg bg-white shadow">
        {selectedTab === 'logs' && (
          <div className="p-6">
            <h3 className="mb-4 text-lg font-medium">Recent Logs</h3>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {data.logs.map((log, index) => (
                <div
                  key={index}
                  className="border-l-4 border-gray-200 py-2 pl-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        logLevelColors[log.level]
                      }`}
                    >
                      {logLevelNames[log.level]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-900">{log.message}</p>
                  {log.context && (
                    <pre className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                  {log.error && (
                    <pre className="mt-1 rounded bg-red-50 p-2 text-xs text-red-600">
                      {JSON.stringify(log.error, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'performance' && (
          <div className="p-6">
            <h3 className="mb-4 text-lg font-medium">Performance Metrics</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(data.performance).map(([name, stats]) => (
                <div key={name} className="rounded-lg border p-4">
                  <h4 className="font-medium text-gray-900">{name}</h4>
                  {stats && (
                    <div className="mt-2 space-y-1 text-sm">
                      <div>Count: {stats.count}</div>
                      <div>Average: {stats.average?.toFixed(2)}ms</div>
                      <div>Min: {stats.min?.toFixed(2)}ms</div>
                      <div>Max: {stats.max?.toFixed(2)}ms</div>
                      <div>P95: {stats.p95?.toFixed(2)}ms</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'errors' && (
          <div className="p-6">
            <h3 className="mb-4 text-lg font-medium">Error Statistics</h3>
            <div className="space-y-2">
              {data.errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-red-50 p-3"
                >
                  <span className="text-sm font-medium text-red-900">
                    {error.error}
                  </span>
                  <span className="rounded bg-red-100 px-2 py-1 text-sm text-red-600">
                    {error.count} occurrences
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'activities' && (
          <div className="p-6">
            <h3 className="mb-4 text-lg font-medium">User Activities</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-medium text-gray-900">Top Actions</h4>
                <div className="space-y-2">
                  {data.activities.topActions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-700">
                        {action.action}
                      </span>
                      <span className="text-sm text-gray-500">
                        {action.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-gray-900">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div>Total Activities: {data.activities.totalActivities}</div>
                  <div>Unique Users: {data.activities.uniqueUsers}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'health' && (
          <div className="p-6">
            <h3 className="mb-4 text-lg font-medium">Health Checks</h3>
            <div className="space-y-2">
              {Object.entries(data.health.checks).map(([check, healthy]) => (
                <div
                  key={check}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {check}
                  </span>
                  <div className="flex items-center">
                    <div
                      className={`mr-2 h-2 w-2 rounded-full ${
                        healthy ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></div>
                    <span
                      className={`text-sm ${
                        healthy ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {healthy ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Last updated: {new Date(data.health.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
