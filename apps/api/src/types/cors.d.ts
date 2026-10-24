declare module "cors" {
  import type { RequestHandler } from "express";

  interface CorsOptions {
    origin?: string;
    credentials?: boolean;
  }

  function cors(options?: CorsOptions): RequestHandler;
  export default cors;
}
