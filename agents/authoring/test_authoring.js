require('dotenv').config();
const OpenAI = require('openai');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const fs = require('fs');

const ilmu = new OpenAI({
  apiKey: process.env.ILMU_API_KEY,
  baseURL: 'https://api.ilmu.ai/v1',
});

const MCP_SERVER_URL = process.env.PLAYWRIGHT_MCP_URL || 'http://localhost:8931/sse';

async function authorTest(testCaseId, goal, steps) {
  const mcpClient = new Client({ name: 'test-authoring-agent', version: '1.0.0' }, { capabilities: {} });
  await mcpClient.connect(new SSEClientTransport(new URL(MCP_SERVER_URL)));

  const { tools: mcpTools } = await mcpClient.listTools();
  const openaiTools = mcpTools.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));

  const systemPrompt = `You are driving a real browser via the provided tools to perform the described test flow.

For every browser action you take, also emit the exact equivalent Playwright TypeScript line, the same style Codegen produces, e.g. await page.getByRole('button', { name: 'Next' }).click();
Output each line inside <code_line></code_line> tags in your response text, alongside taking that action.
Add a real await expect(...) assertion after any step that should confirm something actually worked.

Test case: ${testCaseId}
Goal: ${goal}
Steps:
${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

When finished, output <code_line>// DONE</code_line> and stop.`;

  let messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Begin, starting with navigating to the site.' },
  ];
  const generatedLines = [];

  for (let turn = 0; turn < 40; turn++) {
    const response = await ilmu.chat.completions.create({
      model: 'ILMU_GLM_5.1',
      messages,
      tools: openaiTools,
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;
    const lines = [...(message.content || '').matchAll(/<code_line>([\s\S]*?)<\/code_line>/g)].map(m => m[1].trim());
    generatedLines.push(...lines);
    messages.push(message);

    if (lines.some(l => l.includes('// DONE'))) break;

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const result = await mcpClient.callTool({
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
        });
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result.content) });
      }
    } else {
      messages.push({ role: 'user', content: 'Continue.' });
    }
  }

  const spec = `import { test, expect } from '@playwright/test';\n\ntest('test', async ({ page }) => {\n${generatedLines.filter(l => l !== '// DONE').map(l => '  ' + l).join('\n')}\n});\n`;
  fs.writeFileSync(`incoming-scripts/${testCaseId}.draft.spec.ts`, spec);
  console.log(`Draft written to incoming-scripts/${testCaseId}.draft.spec.ts`);
  await mcpClient.close();
}

const testCaseId = process.argv[2];
if (!testCaseId) { console.error('Usage: node test-authoring-agent.js <test-case-id>'); process.exit(1); }
authorTest(testCaseId, 'Purchase a Samsung Galaxy A57 5G on a postpaid plan through checkout', [
  'Access the devices page',
  'Select the Samsung Galaxy A57 5G device',
  'Select color variant Awesome Iceblue and storage 12GB+512GB',
  'Select the Infinite+ Premium plan with 36 months contract',
  'Select eSIM as the SIM type',
  'Click Next to proceed to verification',
  'Fill in personal details: Passport ID P5833558, name TESTUSER, gender Female, DOB 06/02/1983, phone 0149645779, email OBRMEMAIL@GMAIL.COM',
  'Accept the terms and conditions and privacy consent checkboxes',
  'Click Next then PROCEED to confirm the order',
  'Fill in delivery address: 11,JLN PANTAI SENTRAL 3 PANTAI DALAM, Unit 19-23, Postal Code 59200',
  'Click Next to proceed to payment',
]);