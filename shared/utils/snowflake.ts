import { config } from "../config/index.js";

const DEFAULT_EPOCH = 1704067200000; // 2024-01-01 UTC

const MACHINE_ID_BITS = 10;
const SEQUENCE_BITS = 12;

const MAX_MACHINE_ID = (1 << MACHINE_ID_BITS) - 1;
const MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1;

const MACHINE_ID_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + MACHINE_ID_BITS;

export class SnowflakeGenerator {
  private lastTimestamp = -1;
  private sequence = 0;

  constructor(
    private readonly machineId: number,
    private readonly epoch: number = DEFAULT_EPOCH,
  ) {
    if (!Number.isInteger(machineId)) {
      throw new Error("machineId must be an integer");
    }

    if (machineId < 0 || machineId > MAX_MACHINE_ID) {
      throw new Error(
        `machineId must be between 0 and ${MAX_MACHINE_ID}, received ${machineId}`,
      );
    }

    if (!Number.isInteger(epoch) || epoch <= 0) {
      throw new Error("epoch must be a positive integer");
    }
  }

  private currentTimestamp(): number {
    return Date.now();
  }

  private waitNextMillis(lastTimestamp: number): number {
    let timestamp = this.currentTimestamp();

    while (timestamp <= lastTimestamp) {
      timestamp = this.currentTimestamp();
    }

    return timestamp;
  }

  nextId(): string {
    let timestamp = this.currentTimestamp();

    if (timestamp < this.lastTimestamp) {
      throw new Error(
        `Clock moved backwards. Refusing to generate id for ${this.lastTimestamp - timestamp} ms`,
      );
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & MAX_SEQUENCE;

      if (this.sequence === 0) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    const shiftedTimestamp =
      BigInt(timestamp - this.epoch) << BigInt(TIMESTAMP_SHIFT);
    const shiftedMachineId = BigInt(this.machineId) << BigInt(MACHINE_ID_SHIFT);
    const sequence = BigInt(this.sequence);

    return (shiftedTimestamp | shiftedMachineId | sequence).toString();
  }

  nextOrderId(): string {
    return `ORD_${this.nextId()}`;
  }
}

export const snowflakeGenerator = new SnowflakeGenerator(
  config.snowflake.machineId,
);

export function generateSnowflakeId(): string {
  return snowflakeGenerator.nextId();
}

export function generateOrderId(): string {
  return snowflakeGenerator.nextOrderId();
}
