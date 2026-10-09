export class RequestQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (e) {
      reject(e);
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }
}

export const aiRequestQueue = new RequestQueue();
