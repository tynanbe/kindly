import { main } from "./priv/dist/kindly.js";

export * from "./src/javascript_api.ts";
export * as default from "./src/javascript_api.ts";

if (import.meta.main) {
  main();
}
