import path from "node:path";

import { register } from "tsconfig-paths";

register({
  baseUrl: path.resolve(__dirname, "../.."),
  paths: {
    "@/*": ["src/*"],
  },
});
