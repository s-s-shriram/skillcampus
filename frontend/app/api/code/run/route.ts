import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LANGUAGE_IDS: Record<string, number> = { c: 50, cpp: 54, java: 62, python: 71 };

type TestCase = { id: string; input_data: string; expected_output: string };
type JudgeResult = { stdout?: string | null; stderr?: string | null; compile_output?: string | null; message?: string | null; status?: { id: number; description: string } };

const judge0Url = () => (process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/$/, '');
function getHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.JUDGE0_API_KEY) headers['X-Auth-Token'] = process.env.JUDGE0_API_KEY;
  return headers;
}
const normalize = (value: string | null | undefined) => (value ?? '').replace(/\r\n/g, '\n').trim();

async function execute(languageId: number, code: string, test: TestCase): Promise<JudgeResult> {
  const response = await fetch(`${judge0Url()}/submissions/?base64_encoded=false&wait=true`, {
    method: 'POST', headers: getHeaders(), cache: 'no-store',
    body: JSON.stringify({ language_id: languageId, source_code: code, stdin: test.input_data, expected_output: test.expected_output, cpu_time_limit: 2, wall_time_limit: 5, memory_limit: 128000 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Judge0 returned HTTP ${response.status}.`);
  return data as JudgeResult;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const language = String(body?.language || '').toLowerCase();
    const code = typeof body?.code === 'string' ? body.code : '';
    const tests = Array.isArray(body?.tests) ? body.tests as TestCase[] : [];
    if (!LANGUAGE_IDS[language]) return NextResponse.json({ error: 'Only C, C++, Java and Python execution is supported right now.' }, { status: 400 });
    if (!code.trim()) return NextResponse.json({ error: 'Code cannot be empty.' }, { status: 400 });
    if (code.length > 50000) return NextResponse.json({ error: 'Code is too large.' }, { status: 400 });
    if (tests.length === 0 || tests.length > 10) return NextResponse.json({ error: 'Provide between 1 and 10 public test cases.' }, { status: 400 });

    const results = [];
    for (const test of tests) {
      const input = String(test.input_data ?? '');
      const expected = normalize(test.expected_output);
      if (input.length > 10000 || expected.length > 10000) {
        results.push({ id: String(test.id), passed: false, actual: '', expected, error: 'Test case is too large.' });
        continue;
      }
      try {
        const result = await execute(LANGUAGE_IDS[language], code, test);
        const actual = normalize(result.stdout);
        const error = normalize(result.compile_output) || normalize(result.stderr) || normalize(result.message);
        const passed = result.status?.id === 3 && !error && actual === expected;
        results.push({ id: String(test.id), passed, actual: error || actual, expected, ...(passed ? {} : { error: error || `Judge0 status: ${result.status?.description || 'Output did not match.'}` }) });
      } catch (error) {
        results.push({ id: String(test.id), passed: false, actual: '', expected, error: error instanceof Error ? error.message : 'Unable to reach Judge0.' });
      }
    }
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Judge0 execution error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request.' }, { status: 400 });
  }
}
