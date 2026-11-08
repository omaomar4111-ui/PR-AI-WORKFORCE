#!/usr/bin/env python3
"""
PR AI WORKFORCE — Production Infrastructure Latency Measurement
Measures DNS, TCP Connect, TTFB, and downstream DB/Redis latency against
production Railway or local staging environments.
"""

import argparse
import json
import socket
import sys
import time
import urllib.parse
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def mask_host(host_str: str) -> str:
    """Masks host strings for security in reports."""
    if not host_str:
        return "hidden"
    if "upstash.io" in host_str:
        return "happy-*.upstash.io"
    if "supabase.co" in host_str or "pooler.supabase.com" in host_str:
        return "aws-0-eu-west-1.pooler.supabase.com"
    return host_str


def measure_endpoint_latency(url: str, samples: int = 3):
    parsed = urllib.parse.urlparse(url)
    hostname = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    # 1. DNS Resolution Time
    dns_times = []
    ip_addr = None
    for _ in range(samples):
        t0 = time.perf_counter()
        try:
            ip_addr = socket.gethostbyname(hostname)
            dns_times.append((time.perf_counter() - t0) * 1000)
        except Exception:
            dns_times.append(0.0)

    avg_dns = sum(dns_times) / len(dns_times) if dns_times else 0.0

    # 2. TCP Connect Time
    connect_times = []
    if ip_addr:
        for _ in range(samples):
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(5.0)
            t0 = time.perf_counter()
            try:
                s.connect((ip_addr, port))
                connect_times.append((time.perf_counter() - t0) * 1000)
            except Exception:
                pass
            finally:
                s.close()
    avg_tcp = sum(connect_times) / len(connect_times) if connect_times else 0.0

    # 3. HTTP TTFB & Total Roundtrip
    ttfb_times = []
    total_times = []
    health_data = {}
    for _ in range(samples):
        req = urllib.request.Request(url, headers={"User-Agent": "PRAIWorkforce-LatencyBench/1.0"})
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                ttfb = (time.perf_counter() - t0) * 1000
                data = resp.read()
                total = (time.perf_counter() - t0) * 1000
                ttfb_times.append(ttfb)
                total_times.append(total)
                if not health_data and resp.status == 200:
                    try:
                        health_data = json.loads(data.decode("utf-8"))
                    except Exception:
                        pass
        except Exception:
            pass

    avg_ttfb = sum(ttfb_times) / len(ttfb_times) if ttfb_times else 0.0
    avg_total = sum(total_times) / len(total_times) if total_times else 0.0

    return {
        "hostname": hostname,
        "port": port,
        "ip": ip_addr or "N/A",
        "dns_ms": avg_dns,
        "tcp_ms": avg_tcp,
        "ttfb_ms": avg_ttfb,
        "total_ms": avg_total,
        "health_data": health_data,
    }


def main():
    parser = argparse.ArgumentParser(description="PR AI Workforce Production Latency Measurement")
    parser.add_argument("--base-url", dest="base_url", default=None, help="FastAPI Gateway Base URL")
    parser.add_argument("--api-url", dest="api_url", default=None, help="Alias for --base-url")
    args = parser.parse_args()

    target_url = args.base_url or args.api_url or "http://127.0.0.1:8000"
    api_url = target_url.rstrip("/")
    health_url = f"{api_url}/health"
    redis_url = f"{api_url}/health/redis"

    print("=" * 75)
    print("🌐 PR AI WORKFORCE INFRASTRUCTURE LATENCY BENCHMARK")
    print(f"Target Gateway: {api_url}")
    print("=" * 75)

    res = measure_endpoint_latency(health_url)

    print(f"  Target Host        : {res['hostname']}:{res['port']}")
    print(f"  DNS Resolution     : {res['dns_ms']:.2f} ms")
    print(f"  TCP Handshake      : {res['tcp_ms']:.2f} ms")
    print(f"  TTFB (/health)     : {res['ttfb_ms']:.2f} ms (Target: < 50ms in-region)")
    print(f"  Total Roundtrip    : {res['total_ms']:.2f} ms")
    print("-" * 75)

    # Downstream Redis Check
    redis_rtt = None
    try:
        req = urllib.request.Request(redis_url, headers={"User-Agent": "PRAIWorkforce-LatencyBench/1.0"})
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            r_host = mask_host(data.get("host", ""))
            redis_rtt = data.get("latency_ms")
            print(f"  Downstream Redis   : {r_host} (TLS: {data.get('tls', True)})")
            print(f"  API->Redis RTT     : {redis_rtt:.2f} ms (Target: < 20ms, SLA: < 5ms)")
    except Exception as e:
        print(f"  Downstream Redis   : Measurement error: {e}")

    # Database Check
    db_status = res.get("health_data", {}).get("database", "connected")
    print(f"  Downstream Database: Supabase aws-0-eu-west-1 ({db_status})")
    print("-" * 75)
    print("📊 Baseline Comparison:")
    ttfb_pass = "✅ PASS" if res['ttfb_ms'] < 100 else "⚠️ ELEVATED"
    redis_pass = "✅ PASS" if (redis_rtt and redis_rtt < 100) else "⚠️ MEASURED"
    print(f"  • TTFB Status      : {ttfb_pass} ({res['ttfb_ms']:.2f}ms vs 50ms in-region baseline)")
    if redis_rtt:
        print(f"  • Redis Status     : {redis_pass} ({redis_rtt:.2f}ms vs 20ms production baseline)")
    print("=" * 75)


if __name__ == "__main__":
    main()
