import { BatchSpanProcessor, ConsoleSpanExporter, SpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSDK } from '@opentelemetry/sdk-node'
import * as process from 'process'
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { GlobalConfig } from './config/global.config'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { ConsoleMetricExporter, IMetricReader, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SemanticResourceAttributes,
} from '@opentelemetry/semantic-conventions'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { HostMetrics } from '@opentelemetry/host-metrics'
import { metrics } from '@opentelemetry/api'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'

/*
Useful links:
  https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
  https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-pino
  https://github.com/pinojs/pino-opentelemetry-transport
  https://opentelemetry.io/docs/concepts/semantic-conventions/
*/

export const otelSDK = new NodeSDK({
  spanProcessors: getProcessors(),
  metricReader: getMetricReader(),
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: GlobalConfig.otlp.attrs.serviceName,
    [ATTR_SERVICE_VERSION]: GlobalConfig.otlp.attrs.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: GlobalConfig.otlp.attrs.deploymentEnvironment,
  }),
  instrumentations: [new NestInstrumentation(), new PinoInstrumentation()],
})

function getProcessors(): SpanProcessor[] {
  return [
    new BatchSpanProcessor(
      GlobalConfig.otlp.debugInConsole
        ? new ConsoleSpanExporter()
        : new OTLPTraceExporter({
            url: `${GlobalConfig.otlp.rootUrl}/v1/traces`,
            headers: {},
          })
    ),
  ]
}

function getMetricReader(): IMetricReader {
  return new PeriodicExportingMetricReader({
    exporter: GlobalConfig.otlp.debugInConsole
      ? new ConsoleMetricExporter()
      : new OTLPMetricExporter({
          url: `${GlobalConfig.otlp.rootUrl}/v1/metrics`,
        }),
  })
}

let hostMetricsSDK: HostMetrics | undefined
export function getHostMetricsSDK(): HostMetrics {
  if (hostMetricsSDK) {
    return hostMetricsSDK
  }

  hostMetricsSDK = new HostMetrics({
    meterProvider: metrics.getMeterProvider(),
  })
  return hostMetricsSDK
}

function shutdownSDK(): void {
  otelSDK
    .shutdown()
    .then(() => {
      console.log('OpenTelemetry SDK shutdown successfully.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error shutting down OpenTelemetry SDK: ', error)
      process.exit(1)
    })
}

process.on('SIGTERM', (): void => shutdownSDK())
process.on('SIGINT', (): void => shutdownSDK())
