# Queue Providers

> Purpose: Asynchronous job and message queue providers.

## Future Responsibilities

- Job queuing and processing
- Delayed job execution
- Job retry with backoff
- Dead letter queues
- Job progress tracking
- Worker scaling

## Expected Implementations

| Provider | Status | Notes |
|----------|--------|-------|
| BullMQ | Future (P12.1+) | Redis-based. Full-featured. Node.js native. |
| RabbitMQ | Future (P12.1+) | AMQP protocol. Multi-language. |
| Kafka | Future (P12.1+) | Event streaming. High throughput. |
| In-Memory Queue | Future (P12.0.4+) | Development/testing. No external deps. |

## Integration with Repository Engine

Queue providers integrate with the Scheduler capability. Jobs are created
through the repository event system (ENTITY_CREATED, ENTITY_UPDATED, etc.).
