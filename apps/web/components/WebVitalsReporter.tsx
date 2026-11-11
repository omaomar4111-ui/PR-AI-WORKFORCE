"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

/**
 * Real User Monitoring (RUM) Component.
 * Collects Google Core Web Vitals (LCP, INP, CLS, FCP, TTFB) from active browser sessions
 * and delivers them via sendBeacon / fetch to the backend telemetry collector.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    function sendMetric(metric: Metric) {
      const payload = {
        name: metric.name,
        value: Number(metric.value.toFixed(2)),
        rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
        delta: Number(metric.delta.toFixed(2)),
        id: metric.id,
        navigationType: metric.navigationType,
        url: typeof window !== "undefined" ? window.location.pathname : "",
        timestamp: Date.now(),
      };

      // Diagnostic console log for local development and verification
      console.log(
        `%c[RUM Web Vitals]%c ${metric.name}: ${payload.value} (${metric.rating})`,
        "color: #8b5cf6; font-weight: bold;",
        "color: inherit;",
        payload
      );

      // Ingest into telemetry metrics endpoint using navigator.sendBeacon (non-blocking)
      const endpoint = "/api/metrics";
      const body = JSON.stringify(payload);

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
      } else if (typeof fetch !== "undefined") {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {
          // Silent catch for telemetry
        });
      }
    }

    try {
      onCLS(sendMetric);
      onFCP(sendMetric);
      onINP(sendMetric);
      onLCP(sendMetric);
      onTTFB(sendMetric);
    } catch (err) {
      console.warn("[RUM] Failed to register web-vitals listeners:", err);
    }
  }, []);

  return null;
}

export default WebVitalsReporter;
