/**
 * IExampleJobData — typed job payload for the example-queue.
 *
 * Replace with your actual domain data when implementing real queues.
 */
export interface IExampleJobData {
  /** ID of the entity to process */
  entityId: string;
  /** Arbitrary metadata for the job */
  payload: Record<string, unknown>;
}
