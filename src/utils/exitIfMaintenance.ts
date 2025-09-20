import { broadcast } from "../logging";

export const exitIfMaintenance = (maintenanceCheck: () => boolean): void => {
  if (maintenanceCheck()) {
    broadcast("Site em manutenção detectado, encerrando processo", "control");
    process.exit();
  }
};
