/**
 * bus-impl-v2 is deployed only as EKS containers. The exported symbol remains as
 * an explicit migration guard so an old Lambda configuration fails closed
 * instead of starting the service with fabricated credentials or open CORS.
 */
export function handler(): Promise<never> {
  return Promise.reject(
    new Error(
      "Lambda is not a supported runtime for bus-impl-v2. Deploy dist/src/main.js through the EKS/Helm delivery path.",
    ),
  );
}
