
#Foo Chao, A0272024R
# AI Assistance: GitHub Copilot (Claude Sonnet 4.6)

# create-dashboards.ps1
# Foo Chao, A0272024R
# Creates 6 Grafana dashboards for catalog, checkout, and admin stress tests.
# Run from any directory: pwsh tests/stress/create-dashboards.ps1
# Requires: Grafana on localhost:3001, InfluxDB datasource UID afhzsvtf0z85cf

$GrafanaUrl = 'http://localhost:3001/api/dashboards/db'
$Auth       = @{ Authorization = 'Basic YWRtaW46YWRtaW4=' }

function Post-Dashboard($body) {
    Invoke-RestMethod -Uri $GrafanaUrl -Method POST -Body $body `
        -ContentType 'application/json' -Headers $Auth
}

# ─── Dashboard 1: catalog-stress-solo ────────────────────────────────────────
$d1 = @'
{
  "dashboard": {
    "id": null,
    "uid": "catalog-stress-solo",
    "title": "Catalog Stress Solo",
    "tags": ["k6","stress","catalog"],
    "schemaVersion": 27,
    "version": 0,
    "refresh": "5s",
    "time": {"from": "now-30m", "to": "now"},
    "panels": [{
      "id": 1,
      "type": "graph",
      "title": "Active VUs / Error Rate / product_list p95",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "lines": true, "linewidth": 2, "fill": 1, "nullPointMode": "null",
      "yaxes": [
        {"format": "short", "label": "VUs", "show": true, "logBase": 1, "min": 0},
        {"format": "ms",    "label": "ms / %", "show": true, "logBase": 1, "min": 0}
      ],
      "seriesOverrides": [
        {"alias": "Active VUs",         "color": "#73BF69", "yaxis": 1, "linewidth": 2},
        {"alias": "Error Rate %",        "color": "#F2495C", "yaxis": 2, "linewidth": 1},
        {"alias": "product_list p95 (ms)","color": "#5794F2", "yaxis": 2, "linewidth": 2}
      ],
      "targets": [
        {
          "refId": "A", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Active VUs",
          "query": "SELECT mean(\"value\") FROM \"vus\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "B", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Error Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"http_req_failed\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "C", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "product_list p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'product_list') AND $timeFilter GROUP BY time($__interval) fill(null)"
        }
      ]
    }]
  },
  "overwrite": true
}
'@

# ─── Dashboard 2: catalog-stress ─────────────────────────────────────────────
$d2 = @'
{
  "dashboard": {
    "id": null,
    "uid": "catalog-stress",
    "title": "Catalog Stress Combined",
    "tags": ["k6","stress","catalog"],
    "schemaVersion": 27,
    "version": 0,
    "refresh": "5s",
    "time": {"from": "now-30m", "to": "now"},
    "panels": [{
      "id": 1,
      "type": "graph",
      "title": "Active VUs / Error Rate / Catalog p95 Lines",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "lines": true, "linewidth": 2, "fill": 1, "nullPointMode": "null",
      "yaxes": [
        {"format": "short", "label": "VUs",     "show": true, "logBase": 1, "min": 0},
        {"format": "ms",    "label": "ms / %",  "show": true, "logBase": 1, "min": 0}
      ],
      "seriesOverrides": [
        {"alias": "Active VUs",             "color": "#73BF69", "yaxis": 1, "linewidth": 2},
        {"alias": "Error Rate %",            "color": "#F2495C", "yaxis": 2, "linewidth": 1},
        {"alias": "photo_stress p99 (ms)",   "color": "#FF780A", "yaxis": 2, "linewidth": 2},
        {"alias": "product_list p95 (ms)",   "color": "#5794F2", "yaxis": 2, "linewidth": 2},
        {"alias": "search_stress p95 (ms)",  "color": "#FADE2A", "yaxis": 2, "linewidth": 2}
      ],
      "targets": [
        {
          "refId": "A", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Active VUs",
          "query": "SELECT mean(\"value\") FROM \"vus\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "B", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Error Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"http_req_failed\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "C", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "photo_stress p99 (ms)",
          "query": "SELECT percentile(\"value\", 99) FROM \"http_req_duration\" WHERE (\"scenario\" = 'photo_stress') AND $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "D", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "product_list p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'product_list') AND $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "E", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "search_stress p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'search_stress') AND $timeFilter GROUP BY time($__interval) fill(null)"
        }
      ]
    }]
  },
  "overwrite": true
}
'@

# ─── Dashboard 3: checkout-stress-solo ───────────────────────────────────────
$d3 = @'
{
  "dashboard": {
    "id": null,
    "uid": "checkout-stress-solo",
    "title": "Checkout Stress Solo",
    "tags": ["k6","stress","checkout"],
    "schemaVersion": 27,
    "version": 0,
    "refresh": "5s",
    "time": {"from": "now-30m", "to": "now"},
    "panels": [{
      "id": 1,
      "type": "graph",
      "title": "Active VUs / Error Rate / token_ramp p95",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "lines": true, "linewidth": 2, "fill": 1, "nullPointMode": "null",
      "yaxes": [
        {"format": "short", "label": "VUs",    "show": true, "logBase": 1, "min": 0},
        {"format": "ms",    "label": "ms / %", "show": true, "logBase": 1, "min": 0}
      ],
      "seriesOverrides": [
        {"alias": "Active VUs",          "color": "#73BF69", "yaxis": 1, "linewidth": 2},
        {"alias": "Error Rate %",         "color": "#F2495C", "yaxis": 2, "linewidth": 1},
        {"alias": "token_ramp p95 (ms)",  "color": "#5794F2", "yaxis": 2, "linewidth": 2}
      ],
      "targets": [
        {
          "refId": "A", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Active VUs",
          "query": "SELECT mean(\"value\") FROM \"vus\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "B", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Error Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"http_req_failed\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "C", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "token_ramp p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'token_ramp') AND $timeFilter GROUP BY time($__interval) fill(null)"
        }
      ]
    }]
  },
  "overwrite": true
}
'@

# ─── Dashboard 4: checkout-stress ────────────────────────────────────────────
$d4 = @'
{
  "dashboard": {
    "id": null,
    "uid": "checkout-stress",
    "title": "Checkout Stress Combined",
    "tags": ["k6","stress","checkout"],
    "schemaVersion": 27,
    "version": 0,
    "refresh": "5s",
    "time": {"from": "now-30m", "to": "now"},
    "panels": [{
      "id": 1,
      "type": "graph",
      "title": "Active VUs / Error Rate / Checkout p95 Lines",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "lines": true, "linewidth": 2, "fill": 1, "nullPointMode": "null",
      "yaxes": [
        {"format": "short", "label": "VUs",    "show": true, "logBase": 1, "min": 0},
        {"format": "ms",    "label": "ms / %", "show": true, "logBase": 1, "min": 0}
      ],
      "seriesOverrides": [
        {"alias": "Active VUs",           "color": "#73BF69", "yaxis": 1, "linewidth": 2},
        {"alias": "Error Rate %",          "color": "#F2495C", "yaxis": 2, "linewidth": 1},
        {"alias": "token_ramp p95 (ms)",   "color": "#5794F2", "yaxis": 2, "linewidth": 2},
        {"alias": "orders_ramp p95 (ms)",  "color": "#73BF69", "yaxis": 2, "linewidth": 2}
      ],
      "targets": [
        {
          "refId": "A", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Active VUs",
          "query": "SELECT mean(\"value\") FROM \"vus\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "B", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Error Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"http_req_failed\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "C", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "token_ramp p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'token_ramp') AND $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "D", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "orders_ramp p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'orders_ramp') AND $timeFilter GROUP BY time($__interval) fill(null)"
        }
      ]
    }]
  },
  "overwrite": true
}
'@

# ─── Dashboard 5: admin-stress-solo ──────────────────────────────────────────
$d5 = @'
{
  "dashboard": {
    "id": null,
    "uid": "admin-stress-solo",
    "title": "Admin Stress Solo",
    "tags": ["k6","stress","admin"],
    "schemaVersion": 27,
    "version": 0,
    "refresh": "5s",
    "time": {"from": "now-30m", "to": "now"},
    "panels": [{
      "id": 1,
      "type": "graph",
      "title": "Active VUs / Error Rate / all_orders_poll p95",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "lines": true, "linewidth": 2, "fill": 1, "nullPointMode": "null",
      "yaxes": [
        {"format": "short", "label": "VUs",    "show": true, "logBase": 1, "min": 0},
        {"format": "ms",    "label": "ms / %", "show": true, "logBase": 1, "min": 0}
      ],
      "seriesOverrides": [
        {"alias": "Active VUs",               "color": "#73BF69", "yaxis": 1, "linewidth": 2},
        {"alias": "Error Rate %",              "color": "#F2495C", "yaxis": 2, "linewidth": 1},
        {"alias": "all_orders_poll p95 (ms)",  "color": "#5794F2", "yaxis": 2, "linewidth": 2}
      ],
      "targets": [
        {
          "refId": "A", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Active VUs",
          "query": "SELECT mean(\"value\") FROM \"vus\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "B", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Error Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"http_req_failed\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "C", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "all_orders_poll p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'all_orders_poll') AND $timeFilter GROUP BY time($__interval) fill(null)"
        }
      ]
    }]
  },
  "overwrite": true
}
'@

# ─── Dashboard 6: admin-stress ───────────────────────────────────────────────
$d6 = @'
{
  "dashboard": {
    "id": null,
    "uid": "admin-stress",
    "title": "Admin Stress Combined",
    "tags": ["k6","stress","admin"],
    "schemaVersion": 27,
    "version": 0,
    "refresh": "5s",
    "time": {"from": "now-30m", "to": "now"},
    "panels": [{
      "id": 1,
      "type": "graph",
      "title": "Active VUs / Error Rate / Admin p95 Lines",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "lines": true, "linewidth": 2, "fill": 1, "nullPointMode": "null",
      "yaxes": [
        {"format": "short", "label": "VUs",    "show": true, "logBase": 1, "min": 0},
        {"format": "ms",    "label": "ms / %", "show": true, "logBase": 1, "min": 0}
      ],
      "seriesOverrides": [
        {"alias": "Active VUs",                   "color": "#73BF69", "yaxis": 1, "linewidth": 2},
        {"alias": "Error Rate %",                  "color": "#F2495C", "yaxis": 2, "linewidth": 1},
        {"alias": "order_status_updates p95 (ms)", "color": "#F2495C", "yaxis": 2, "linewidth": 2},
        {"alias": "category_churn p95 (ms)",       "color": "#FF780A", "yaxis": 2, "linewidth": 2},
        {"alias": "all_orders_poll p95 (ms)",      "color": "#5794F2", "yaxis": 2, "linewidth": 2}
      ],
      "targets": [
        {
          "refId": "A", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Active VUs",
          "query": "SELECT mean(\"value\") FROM \"vus\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "B", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Error Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"http_req_failed\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "C", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "order_status_updates p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'order_status_updates') AND $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "D", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "category_churn p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'category_churn') AND $timeFilter GROUP BY time($__interval) fill(null)"
        },
        {
          "refId": "E", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "all_orders_poll p95 (ms)",
          "query": "SELECT percentile(\"value\", 95) FROM \"http_req_duration\" WHERE (\"scenario\" = 'all_orders_poll') AND $timeFilter GROUP BY time($__interval) fill(null)"
        }
      ]
    }]
  },
  "overwrite": true
}
'@

# ─── POST all dashboards ──────────────────────────────────────────────────────
$dashboards = @(
    @{ name = 'catalog-stress-solo';  body = $d1 },
    @{ name = 'catalog-stress';       body = $d2 },
    @{ name = 'checkout-stress-solo'; body = $d3 },
    @{ name = 'checkout-stress';      body = $d4 },
    @{ name = 'admin-stress-solo';    body = $d5 },
    @{ name = 'admin-stress';         body = $d6 }
)

foreach ($d in $dashboards) {
    try {
        $result = Post-Dashboard $d.body
        Write-Host "OK  $($d.name) -> uid=$($result.uid) url=$($result.url)"
    } catch {
        Write-Host "ERR $($d.name): $_"
    }
}
