import client from "prom-client";

export const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({ register: metricsRegistry });

export const orderRequestsTotal = new client.Counter({
  name: "ecommerce_order_requests_total",
  help: "Total number of order requests received by the gateway",
  registers: [metricsRegistry],
});

export const orderSuccessTotal = new client.Counter({
  name: "ecommerce_order_success_total",
  help: "Total number of successfully accepted orders",
  registers: [metricsRegistry],
});

export const orderOutOfStockTotal = new client.Counter({
  name: "ecommerce_order_out_of_stock_total",
  help: "Total number of rejected orders due to insufficient stock",
  registers: [metricsRegistry],
});

export const redisCacheHitsTotal = new client.Counter({
  name: "ecommerce_redis_cache_hits_total",
  help: "Total number of Redis stock cache hits",
  registers: [metricsRegistry],
});

export const redisCacheMissesTotal = new client.Counter({
  name: "ecommerce_redis_cache_misses_total",
  help: "Total number of Redis stock cache misses",
  registers: [metricsRegistry],
});

export const pgTransactionResultsTotal = new client.Counter({
  name: "ecommerce_pg_transaction_results_total",
  help: "Total number of PostgreSQL transaction outcomes",
  labelNames: ["status"],
  registers: [metricsRegistry],
});

export const getMetricsContent = async () => {
  return await metricsRegistry.metrics();
};
