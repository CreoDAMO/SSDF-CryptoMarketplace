export interface ActionConfig {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

export function createAction(config: ActionConfig) {
  return {
    ...config,
    execute: config.handler,
  };
}
