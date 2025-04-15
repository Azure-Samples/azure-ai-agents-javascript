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

// Create agent
const agent = await client.agents.createAgent("gpt-4o", {
  name: "my-agent",
  instructions: "You are a helpful agent",
});
console.log(`Created agent, agent ID: ${agent.id}`);

// Create thread
const thread = await client.agents.createThread();
console.log(`Created thread, thread ID: ${thread.id}`);

// Create message
const message = await client.agents.createMessage(thread.id, {
  role: "user",
  content: "hello, world!",
});
console.log(`Created message, message ID: ${message.id}`);

// Create run
let run = await client.agents.createRun(thread.id, agent.id);
console.log(`Created run, run ID: ${run.id}`);

// Wait for run to complete
while (["queued", "in_progress", "requires_action"].includes(run.status)) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  run = await client.agents.getRun(thread.id, run.id);
  console.log(`Run status: ${run.status}`);
}

// List run steps
const runSteps = await client.agents.listRunSteps(thread.id, run.id);
console.log(`Listed run steps, run ID: ${run.id}`);

runSteps.data.forEach(async (runStep) => {
  const step = await client.agents.getRunStep(thread.id, run.id, runStep.id);
  console.log(`Retrieved run step, step ID: ${step}`);
});

// Clean up
await client.agents.deleteThread(thread.id);
console.log(`Deleted thread, thread ID: ${thread.id}`);
await client.agents.deleteAgent(agent.id);
console.log(`Deleted agent, agent ID: ${agent.id}`);
