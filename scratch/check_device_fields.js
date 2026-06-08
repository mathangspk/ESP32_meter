print("One device_states document:");
print(JSON.stringify(db.device_states.findOne({ deviceId: "7B34E3EC" }), null, 2));

print("One telemetry document:");
print(JSON.stringify(db.telemetry.findOne({ serialNumber: "7B34E3EC" }), null, 2));
