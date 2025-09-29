import ChestDescriptorUi from './ChestDescriptor.uischema.json';
import ChestSpawnUi from './ChestSpawn.uischema.json';

export const uiSchemas: Record<string, unknown> = {
  ChestDescriptor: ChestDescriptorUi,
  ChestSpawn: ChestSpawnUi,
};

export function getUiSchemaByKey(key: string): unknown | undefined {
  return uiSchemas[key];
}
