import amqp, { ChannelModel, Channel } from "amqplib";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

export interface RabbitMQInstance {
  connection: ChannelModel;
  channel: Channel;
}

export async function connectRabbitMQ(): Promise<RabbitMQInstance> {
  try {
    const connection: ChannelModel = await amqp.connect(config.rabbitmq.url);
    const channel: Channel = await connection.createChannel();

    await channel.assertExchange(config.rabbitmq.exchanges.order, "direct", {
      durable: true,
    });
    await channel.assertExchange(config.rabbitmq.exchanges.dlx, "direct", {
      durable: true,
    });

    return { connection, channel };
  } catch (error) {
    logger.error(error, "RabbitMQ connection error");
    throw error;
  }
}
