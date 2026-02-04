/**
 * executionQueue.js
 * ─────────────────
 * Queue system for Docker code execution to prevent resource exhaustion.
 * Limits concurrent Docker containers and processes submissions in order.
 */

class ExecutionQueue {
    constructor(maxConcurrent = 10) {
        this.maxConcurrent = maxConcurrent;
        this.running = 0;
        this.queue = [];
    }

    /**
     * Add a task to the queue
     * @param {Function} task - Async function to execute
     * @returns {Promise} - Resolves with task result
     */
    async add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.process();
        });
    }

    /**
     * Process the queue
     */
    async process() {
        // Don't start new tasks if at max concurrency
        if (this.running >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        this.running++;
        const { task, resolve, reject } = this.queue.shift();

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.process(); // Process next item in queue
        }
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            running: this.running,
            queued: this.queue.length,
            maxConcurrent: this.maxConcurrent,
            total: this.running + this.queue.length
        };
    }

    /**
     * Update max concurrent limit
     */
    setMaxConcurrent(max) {
        this.maxConcurrent = max;
        console.log(`📊 Execution queue max concurrent set to ${max}`);
    }
}

// Create singleton instance
const executionQueue = new ExecutionQueue(10); // Max 10 concurrent Docker executions

module.exports = executionQueue;
