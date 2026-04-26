import mqtt, { MqttClient } from "mqtt";
import { config } from "./config";
import { handleTelemetryAlertTransitions } from "./alerts";
import { logger } from "./logger";
import { mongoService } from "./mongodb";
import { serviceState } from "./service-state";
import { telemetryPayloadSchema } from "./types";

export class MqttService {
  private client!: MqttClient;

  async connect(): Promise<void> {
    this.client = mqtt.connect(config.MQTT_URL, {
      username: config.MQTT_USERNAME || undefined,
      password: config.MQTT_PASSWORD || undefined,
      reconnectPeriod: 5000,
    });

    this.client.on("connect", () => {
      serviceState.setMqttConnected(true);
      logger.info({ topic: config.MQTT_TOPIC_PATTERN }, "Connected to MQTT broker");
      this.client.subscribe(config.MQTT_TOPIC_PATTERN, (error) => {
        if (error) {
          logger.error({ err: error }, "Failed to subscribe to MQTT topic");
        }
      });
    });

    this.client.on("close", () => {
      serviceState.setMqttConnected(false);
      logger.warn("MQTT connection closed");
    });

    this.client.on("error", (error) => {
      serviceState.setMqttConnected(false);
      logger.error({ err: error }, "MQTT client error");
    });

    this.client.on("message", async (_topic, message) => {
      try {
        const payload = telemetryPayloadSchema.parse(JSON.parse(message.toString("utf-8")));
        await mongoService.insertTelemetry(payload);
        const previousState = await mongoService.upsertDeviceState(payload);
        await handleTelemetryAlertTransitions(payload, previousState);
      } catch (error) {
        logger.error({ err: error, rawMessage: message.toString("utf-8") }, "Failed to process MQTT message");
      }
    });
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.client.end(false, {}, () => resolve());
    });
    serviceState.setMqttConnected(false);
  }
}

export const mqttService = new MqttService();
