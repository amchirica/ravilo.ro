export function canSeedDemo(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ALLOW_DEV_SEED === "true";
}

export function assertCanSeedDemo(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === "production" && env.ALLOW_DEV_SEED !== "true") {
    throw new Error("Refusing to seed demo data in production");
  }
  if (env.ALLOW_DEV_SEED !== "true") {
    throw new Error("Set ALLOW_DEV_SEED=true to run the demo seed");
  }
}
