print("Claimed and active devices:");
db.device_states.find().forEach(state => {
  if (state.deviceId === "1") return; // Skip mock device
  print("- ID: " + state.deviceId + 
        ", Online: " + !state.isOffline + 
        ", Firmware Version: " + state.lastFirmwareVersion + 
        ", Last Seen: " + state.lastSeenAt);
});
