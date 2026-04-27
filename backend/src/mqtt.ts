import mqtt, { IClientPublishOptions, MqttClient } from "mqtt";
import { config } from "./config";
import { handleTelemetryAlertTransitions } from "./alerts";
import { logger } from "./logger";
import { mongoService } from "./mongodb";
import { serviceState } from "./service-state";
import { otaStatusPayloadSchema, telemetryPayloadSchema } from "./types";

const OTA_STATUS_TOPIC_PATTERN = "meter/+/ota/status";

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
      logger.info({ telemetryTopic: config.MQTT_TOPIC_PATTERN, otaStatusTopic: OTA_STATUS_TOPIC_PATTERN }, "Connected to MQTT broker");
      this.client.subscribe(config.MQTT_TOPIC_PATTERN, (error) => {
        if (error) {
          logger.error({ err: error }, "Failed to subscribe to telemetry topic");
        }
      });
      this.client.subscribe(OTA_STATUS_TOPIC_PATTERN, (error) => {
        if (error) {
          logger.error({ err: error }, "Failed to subscribe to OTA status topic");
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

    this.client.on("message", async (topic, message) => {
      try {
        if (topic.endsWith("/ota/status")) {
          const payload = otaStatusPayloadSchema.parse(JSON.parse(message.toString("utf-8")));
          await mongoService.recordOtaStatus(payload);
          logger.info({ jobId: payload.job_id, deviceId: payload.device_id, status: payload.status }, "Processed OTA status message");
          return;
        }

        const payload = telemetryPayloadSchema.parse(JSON.parse(message.toString("utf-8")));
        await mongoService.insertTelemetry(payload);
        const previousState = await mongoService.upsertDeviceState(payload);
        await handleTelemetryAlertTransitions(payload, previousState);
      } catch (error) {
        logger.error({ err: error, topic, rawMessage: message.toString("utf-8") }, "Failed to process MQTT message");
      }
    });
  }

  async publish(topic: string, payload: string, options?: IClientPublishOptions): Promise<void> {
    if (!this.client || !this.client.connected) {
      throw new Error("MQTT broker is not connected");
    }

    await new Promise<void>((resolve, reject) => {
      this.client.publish(topic, payload, options ?? {}, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
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
