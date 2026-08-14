export interface FrameTaskScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
}

/**
 * Coalesces expensive presentation work onto the next rendered frame. Calling
 * schedule repeatedly before that frame still runs the task only once.
 */
export const createCoalescedFrameTask = (
  scheduler: FrameTaskScheduler,
  task: () => void
) => {
  let frame: number | undefined;

  const schedule = () => {
    if (frame !== undefined) return;
    frame = scheduler.request(() => {
      frame = undefined;
      task();
    });
  };

  const cancel = () => {
    if (frame === undefined) return;
    scheduler.cancel(frame);
    frame = undefined;
  };

  return { schedule, cancel };
};
