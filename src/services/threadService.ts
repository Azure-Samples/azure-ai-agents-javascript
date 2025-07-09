import {
  AgentsClient,
  DoneEvent,
  ErrorEvent,
  MessageStreamEvent,
  RunStreamEvent,
  isOutputOfType,
  ThreadMessage,
  MessageTextContent,
  MessageImageFileContent,
  AgentThread,
  Agent,
  ThreadRun,
  MessageDeltaChunk,
  MessageDeltaTextContent,
  SubmitToolOutputsAction,
  ToolOutput,
  RequiredFunctionToolCall
} from "@azure/ai-agents";
import fs from "fs";
import { PromptConfig } from "../types.js";

export async function addMessageToThread(client: AgentsClient, threadId: string, message: string) {
  await client.messages.create(threadId, 'user', message);
}

export async function printThreadMessages(selectedPromptConfig: PromptConfig, client: AgentsClient, threadId: string) {
  const messagesIterator = await client.messages.list(threadId);
  const messagesArray: ThreadMessage[] = [];

  // Consider pagination for large datasets
  for await (const m of messagesIterator) {
      messagesArray.push(m);
  }

  console.log("\nMessages:\n----------------------------------------------");

  // Messages iterate from oldest to newest - reverse to show newest first
  for (let i = messagesArray.length - 1; i >= 0; i--) {
    const m = messagesArray[i];
    const content = m.content[0];

    if (!content) {
      // Skip if no content
      continue;
    }

    console.log(`Type: ${m.content[0].type}`);
    if (isOutputOfType<MessageTextContent>(m.content[0], "text")) {
      const textContent = m.content[0] as MessageTextContent;
      const role = m.role === "user" ? "User" : "Agent";
      console.log(`${role}: ${textContent.text.value}`);
    }
  }

  if (
    selectedPromptConfig.tool === "code-interpreter" &&
    selectedPromptConfig.filePath
  ) {
    await getImages(client, messagesArray);
  }
}

export async function getImages(
  client: AgentsClient,
  messages: ThreadMessage[]
) {
  console.log("Looking for image files...");
  const fileIds: string[] = [];
  for (const data of messages) {
    for (const content of data.content) {
      const imageFile = (content as MessageImageFileContent).imageFile;
      if (imageFile) {
        fileIds.push(imageFile.fileId);
        const imageFileName = (await client.files.get(imageFile.fileId)).filename;

        const fileContent = await client.files.getContent(imageFile.fileId);
        if (fileContent) {
          const buffer = Buffer.from(fileContent);

          // Ensure downloads directory exists
          if (!fs.existsSync("./downloads")) {
            fs.mkdirSync("./downloads", { recursive: true });
          }

          fs.writeFileSync(`./downloads/${imageFileName}`, buffer);
        } else {
          console.error(
            "Failed to retrieve file content: fileContent is undefined"
          );
        }
        console.log(`Saved image file to: ${imageFileName}`);
      }
    }
  }

  //Delete remote files
  for (const fileId of fileIds) {
    console.log(`Deleting remote image file with ID: ${fileId}`);
    await client.files.delete(fileId);
  }
}

export async function getRunStats(
  runId: string,
  client: AgentsClient,
  thread: AgentThread
) {
  if (runId) {
    const completedRun = await client.runs.get(thread.id, runId);
    console.log("\nToken usage:", completedRun.usage);
  }
}

export async function runAgent(
  client: AgentsClient,
  thread: AgentThread,
  agent: Agent,
  promptConfig: PromptConfig
): Promise<string> {
  const run = client.runs.create(thread.id, agent.id, {parallelToolCalls: false});
  let streamEventMessages = await run.stream();
  let runId = "";

  for await (const eventMessage of streamEventMessages) {

    switch (eventMessage.event) {
      case RunStreamEvent.ThreadRunCreated:
        runId = (eventMessage.data as ThreadRun).id;
        break;

      case MessageStreamEvent.ThreadMessageDelta:
        {
          const messageDelta = eventMessage.data as MessageDeltaChunk;
          messageDelta.delta.content.forEach(async (contentPart) => {
            if (contentPart.type === "text") {
              const textContent = contentPart as MessageDeltaTextContent;
              const textValue = textContent.text?.value || "";
              process.stdout.write(textValue);
            }
            if (contentPart.type === "image_file") {
              process.stdout.write(`\nReceived image file\n`);
            }
          });
        }
        break;

      case RunStreamEvent.ThreadRunRequiresAction:
        let runOutput = eventMessage.data as ThreadRun;
        if (runOutput.requiredAction) {
          const runStream = await processRequiredAction(
            client,
            thread,
            runOutput,
            promptConfig
          );
          if (runStream) {
            streamEventMessages = runStream;
          }
        }
        break;

      case RunStreamEvent.ThreadRunCompleted:
        console.log("\nThread run completed.");
        break;

      case ErrorEvent.Error:
        console.error("Error:", eventMessage.data);
        break;

      case DoneEvent.Done:
        // Nothing to do here
        break;
    }
  }

  return runId;
}

async function processRequiredAction(
  client: AgentsClient,
  thread: AgentThread,
  run: ThreadRun,
  promptConfig: PromptConfig
) {
  if (
    run.requiredAction &&
    isOutputOfType<SubmitToolOutputsAction>(
      run.requiredAction,
      "submit_tool_outputs"
    )
  ) {
    const submitToolOutputsActionOutput = run.requiredAction;
    const toolCalls = submitToolOutputsActionOutput.submitToolOutputs.toolCalls;
    const toolResponses: ToolOutput[] = [];
    for (const toolCall of toolCalls) {
      if (isOutputOfType<RequiredFunctionToolCall>(toolCall, "function")) {
        const toolResponse = promptConfig.executor?.invokeTool(
          toolCall
        ) as ToolOutput;
        console.log(`💡 Function tool ${toolCall.id} - ${toolResponse.output}`);
        if (toolResponse) {
          toolResponses.push(toolResponse);
        }
      }
    }
    if (toolResponses.length > 0) {
      console.log(`Submitting tool outputs to run ID ${run.id}`);
      return client.runs
        .submitToolOutputs(thread.id, run.id, toolResponses)
        .stream();
    }
  }
}
