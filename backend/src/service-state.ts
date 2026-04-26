export class ServiceState {
  private mqttConnected = false;
  private mongodbConnected = false;

  setMqttConnected(connected: boolean): void {
    this.mqttConnected = connected;
  }

  setMongodbConnected(connected: boolean): void {
    this.mongodbConnected = connected;
  }

  snapshot() {
    return {
      mqttConnected: this.mqttConnected,
      mongodbConnected: this.mongodbConnected,
    };
  }
}

export const serviceState = new ServiceState();
