// Setup data transfer object - unified type for setups across the app
export interface SetupDto {
  id: string;
  name?: string | null;
  created?: string;
  modified?: string;
}
