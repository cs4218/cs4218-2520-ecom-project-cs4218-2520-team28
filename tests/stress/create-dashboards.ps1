
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
      "type": "timeseries",
      "title": "Active VUs / Error Rate / product_list p95",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "fieldConfig": {
        "defaults": {"unit": "short", "custom": {"lineWidth": 2}},
        "overrides": [
          {"matcher": {"id": "byName", "options": "Active VUs"},
           "properties": [
             {"id": "color", "value": {"fixedColor": "#73BF69", "mode": "fixed"}},
             {"id": "custom.axisLabel", "value": "VUs"}
           ]},
          {"matcher": {"id": "byName", "options": "Error Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#F2495C", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "Checks Pass Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "color", "value": {"fixedColor": "#FADE2A", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "product_list p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#5794F2", "mode": "fixed"}}
           ]}
        ]
      },
      "options": {
        "legend": {"displayMode": "list", "placement": "bottom"},
        "tooltip": {"mode": "multi", "sort": "desc"}
      },
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
        },
        {
          "refId": "D", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Checks Pass Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"checks\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
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
      "type": "timeseries",
      "title": "Active VUs / Error Rate / Catalog p95 Lines",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "fieldConfig": {
        "defaults": {"unit": "short", "custom": {"lineWidth": 2}},
        "overrides": [
          {"matcher": {"id": "byName", "options": "Active VUs"},
           "properties": [
             {"id": "color", "value": {"fixedColor": "#73BF69", "mode": "fixed"}},
             {"id": "custom.axisLabel", "value": "VUs"}
           ]},
          {"matcher": {"id": "byName", "options": "Error Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#F2495C", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "Checks Pass Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "color", "value": {"fixedColor": "#FADE2A", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "photo_stress p99 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#FF780A", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "product_list p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#5794F2", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "search_stress p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#B877D9", "mode": "fixed"}}
           ]}
        ]
      },
      "options": {
        "legend": {"displayMode": "list", "placement": "bottom"},
        "tooltip": {"mode": "multi", "sort": "desc"}
      },
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
        },
        {
          "refId": "F", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Checks Pass Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"checks\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
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
      "type": "timeseries",
      "title": "Active VUs / Error Rate / token_ramp p95",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "fieldConfig": {
        "defaults": {"unit": "short", "custom": {"lineWidth": 2}},
        "overrides": [
          {"matcher": {"id": "byName", "options": "Active VUs"},
           "properties": [
             {"id": "color", "value": {"fixedColor": "#73BF69", "mode": "fixed"}},
             {"id": "custom.axisLabel", "value": "VUs"}
           ]},
          {"matcher": {"id": "byName", "options": "Error Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#F2495C", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "Checks Pass Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "color", "value": {"fixedColor": "#FADE2A", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "token_ramp p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#5794F2", "mode": "fixed"}}
           ]}
        ]
      },
      "options": {
        "legend": {"displayMode": "list", "placement": "bottom"},
        "tooltip": {"mode": "multi", "sort": "desc"}
      },
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
          "alias": "Checks Pass Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"checks\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
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
      "type": "timeseries",
      "title": "Active VUs / Error Rate / Checkout p95 Lines",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "fieldConfig": {
        "defaults": {"unit": "short", "custom": {"lineWidth": 2}},
        "overrides": [
          {"matcher": {"id": "byName", "options": "Active VUs"},
           "properties": [
             {"id": "color", "value": {"fixedColor": "#73BF69", "mode": "fixed"}},
             {"id": "custom.axisLabel", "value": "VUs"}
           ]},
          {"matcher": {"id": "byName", "options": "Error Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#F2495C", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "Checks Pass Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "color", "value": {"fixedColor": "#FADE2A", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "token_ramp p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#5794F2", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "orders_ramp p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#73BF69", "mode": "fixed"}}
           ]}
        ]
      },
      "options": {
        "legend": {"displayMode": "list", "placement": "bottom"},
        "tooltip": {"mode": "multi", "sort": "desc"}
      },
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
        },
        {
          "refId": "E", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Checks Pass Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"checks\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
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
      "type": "timeseries",
      "title": "Active VUs / Error Rate / all_orders_poll p95",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "fieldConfig": {
        "defaults": {"unit": "short", "custom": {"lineWidth": 2}},
        "overrides": [
          {"matcher": {"id": "byName", "options": "Active VUs"},
           "properties": [
             {"id": "color", "value": {"fixedColor": "#73BF69", "mode": "fixed"}},
             {"id": "custom.axisLabel", "value": "VUs"}
           ]},
          {"matcher": {"id": "byName", "options": "Error Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#F2495C", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "Checks Pass Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "color", "value": {"fixedColor": "#FADE2A", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "all_orders_poll p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#5794F2", "mode": "fixed"}}
           ]}
        ]
      },
      "options": {
        "legend": {"displayMode": "list", "placement": "bottom"},
        "tooltip": {"mode": "multi", "sort": "desc"}
      },
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
        },
        {
          "refId": "D", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Checks Pass Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"checks\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
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
      "type": "timeseries",
      "title": "Active VUs / Error Rate / Admin p95 Lines",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 0},
      "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
      "fieldConfig": {
        "defaults": {"unit": "short", "custom": {"lineWidth": 2}},
        "overrides": [
          {"matcher": {"id": "byName", "options": "Active VUs"},
           "properties": [
             {"id": "color", "value": {"fixedColor": "#73BF69", "mode": "fixed"}},
             {"id": "custom.axisLabel", "value": "VUs"}
           ]},
          {"matcher": {"id": "byName", "options": "Error Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#F2495C", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "Checks Pass Rate %"},
           "properties": [
             {"id": "unit", "value": "percent"},
             {"id": "color", "value": {"fixedColor": "#FADE2A", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "order_status_updates p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#F2495C", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "category_churn p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#FF780A", "mode": "fixed"}}
           ]},
          {"matcher": {"id": "byName", "options": "all_orders_poll p95 (ms)"},
           "properties": [
             {"id": "unit", "value": "ms"},
             {"id": "custom.axisPlacement", "value": "right"},
             {"id": "color", "value": {"fixedColor": "#5794F2", "mode": "fixed"}}
           ]}
        ]
      },
      "options": {
        "legend": {"displayMode": "list", "placement": "bottom"},
        "tooltip": {"mode": "multi", "sort": "desc"}
      },
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
        },
        {
          "refId": "F", "rawQuery": true, "resultFormat": "time_series",
          "datasource": {"uid": "afhzsvtf0z85cf", "type": "influxdb"},
          "alias": "Checks Pass Rate %",
          "query": "SELECT mean(\"value\") * 100 FROM \"checks\" WHERE $timeFilter GROUP BY time($__interval) fill(null)"
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
