import { Worker, SHARE_ENV } from "node:worker_threads";
import type { Prettier, PrettierAsyncTask, SerializedError } from "./types.js";

type WorkerResult = {
  result?: Awaited<ReturnType<Prettier[keyof Prettier]>>;
  error?: SerializedError;
};

class WorkerPool {
  private readonly queue = new Set<PrettierAsyncTask>();
  private readonly workers = new Set<Worker>();
  private readonly idleWorkers = new Set<Worker>();
  private readonly workerState = new WeakMap<Worker, PrettierAsyncTask>();
  private terminated = false;

  constructor(
    private readonly workerScript: URL,
    private readonly maxPoolSize = 1,
  ) {
    for (let i = 0; i < this.maxPoolSize; i++) {
      this.createWorker();
    }
  }

  get isTerminated() {
    return this.terminated;
  }

  get queueSize() {
    return this.queue.size;
  }

  get poolSize() {
    return this.workers.size;
  }

  destroy() {
    this.terminated = true;

    for (const task of this.queue) {
      task.reject!(new Error("Worker pool terminated"));
    }
    this.queue.clear();

    for (const worker of this.workers) {
      const task = this.workerState.get(worker);
      task?.reject!(new Error("Worker pool terminated"));
      worker.terminate();
    }
    this.idleWorkers.clear();
    this.workers.clear();
  }

  async exec<T extends keyof Prettier>(method: T, args: Parameters<Prettier[T]>): Promise<Awaited<ReturnType<Prettier[T]>>> {
    if (this.isTerminated) {
      throw new Error("Worker pool destroyed");
    }
    const task: PrettierAsyncTask<T> = { method, args };

    const deferred = new Promise<Awaited<ReturnType<Prettier[T]>>>((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });

    this.assignTask(task as unknown as PrettierAsyncTask);

    return deferred;
  }

  private assignTask(task: PrettierAsyncTask, worker?: Worker): void {
    if (!worker) {
      worker = this.idleWorkers.values().next().value;
    }
    if (!worker && this.poolSize < this.maxPoolSize) {
      this.createWorker();
      worker = this.idleWorkers.values().next().value;
    }

    if (!worker) {
      this.queue.add(task);
    } else {
      this.idleWorkers.delete(worker);
      this.queue.delete(task);
      this.workerState.set(worker, task);
      worker.postMessage({
        method: task.method,
        args: task.args,
      });
    }
  }

  private freeWorker(worker: Worker): void {
    const task = this.queue.values().next().value;
    if (task) {
      this.assignTask(task, worker);
    } else {
      this.idleWorkers.add(worker);
    }
  }

  private createWorker(): void {
    if (this.isTerminated || this.poolSize >= this.maxPoolSize) {
      return;
    }

    const worker = new Worker(this.workerScript, {
      env: SHARE_ENV,
      name: "prettier",
    });
    worker.on("message", (message: WorkerResult) => {
      this.handleWorkerMessage(worker, message);
    });
    worker.on("error", (error: unknown) => {
      this.handleWorkerDeath(worker, error instanceof Error ? error : new Error(String(error)));
    });
    worker.on("exit", (code) => {
      this.handleWorkerDeath(worker, new Error(`Worker exited unexpectedly with exit code ${code}`));
    });

    this.workers.add(worker);
    this.idleWorkers.add(worker);
  }

  private handleWorkerMessage(worker: Worker, message: WorkerResult): void {
    const task = this.workerState.get(worker);
    this.workerState.delete(worker);

    if (task) {
      if (message.error !== undefined) {
        task.reject!(Object.assign(new Error(message.error.message), message.error));
      } else {
        task.resolve!(message.result as Awaited<ReturnType<Prettier[keyof Prettier]>>);
      }
    }

    this.freeWorker(worker);
  }

  private handleWorkerDeath(worker: Worker, error: Error): void {
    if (!this.workers.has(worker)) {
      return;
    }

    const task = this.workerState.get(worker);
    this.workerState.delete(worker);
    task?.reject!(error);

    this.idleWorkers.delete(worker);
    this.workers.delete(worker);

    const nextTask = this.queue.values().next().value;
    if (nextTask) {
      this.assignTask(nextTask);
    }
  }
}

export default WorkerPool;
