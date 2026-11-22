import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { config } from '../config.js';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: config.region }),
  { marshallOptions: { removeUndefinedValues: true } },
);

export class DynamoEmployeeStore {
  async list() {
    const items = [];
    let cursor;
    do {
      const response = await client.send(new ScanCommand({
        TableName: config.tableName,
        ExclusiveStartKey: cursor,
      }));
      items.push(...(response.Items || []));
      cursor = response.LastEvaluatedKey;
    } while (cursor);
    return items;
  }

  async get(employeeId) {
    const response = await client.send(new GetCommand({
      TableName: config.tableName,
      Key: { employeeId },
    }));
    return response.Item || null;
  }

  async create(employee) {
    await client.send(new PutCommand({
      TableName: config.tableName,
      Item: employee,
      ConditionExpression: 'attribute_not_exists(employeeId)',
    }));
    return employee;
  }

  async update(employeeId, changes) {
    const current = await this.get(employeeId);
    if (!current) return null;
    const updated = { ...current, ...changes, employeeId };
    await client.send(new PutCommand({ TableName: config.tableName, Item: updated }));
    return updated;
  }

  async remove(employeeId) {
    const current = await this.get(employeeId);
    if (!current) return null;
    await client.send(new DeleteCommand({
      TableName: config.tableName,
      Key: { employeeId },
    }));
    return current;
  }
}
