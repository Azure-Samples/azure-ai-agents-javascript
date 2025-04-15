import { AIProjectsClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

import "dotenv/config";

const connectionString =
  process.env["AI_FOUNDRY_PROJECT_CONNECTION_STRING"] ||
  "<project connection string>";

const client = AIProjectsClient.fromConnectionString(
  connectionString || "",
  new DefaultAzureCredential()
);

const thread = await client.agents.createThread();
console.log(`Created thread, thread ID : ${thread.id}`);

const _thread = await client.agents.getThread(thread.id);
console.log(`Retrieved thread, thread ID : ${_thread.id}`);

await client.agents.deleteThread(thread.id);
console.log(`Deleted thread, thread ID : ${_thread.id}`);
