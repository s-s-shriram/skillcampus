import { NextResponse } from 'next/server';

const LANGUAGE_MAP: Record<string, string> = {
  c: 'c',
  cpp: 'c++',
  java: 'java',
  python: 'python',
};

type TestCase = {
  id: string;
  input_data: string;
  expected_output: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const language = String(body?.language ?? '');
    const code = String(body?.code ?? '');
    const tests = Array.isArray(body?.tests) ? body.tests as TestCase[] : [];

    if (!LANGUAGE_MAP[language]) {
      return NextResponse.json({ error: 'Only C, C++, Java and Python execution is supported right now.' }, { status: 400 });
    }
    if (!code.trim()) {
      return NextResponse.json({ error: 'Code cannot be empty.' }, { status: 400 });
    }
    if (code.length > 50000) {
      return NextResponse.json({ error: 'Code is too large.' }, { status: 400 });
    }
    if (tests.length === 0 || tests.length > 10) {
      return NextResponse.json({ error: 'Provide between 1 and 10 public test cases.' }, { status: 400 });
    }

    const pistonUrl = process.env.PISTON_API_URL || 'http://localhost:2000/api/v2/execute';
    const results: Array<{
      id: string;
      passed: boolean;
      actual: string;
      expected: string;
      error?: string;
    }> = [];

    for (const test of tests) {
      const input = String(test?.input_data ?? '');
      const expected = String(test?.expected_output ?? '').trim();

      if (input.length > 10000 || expected.length > 10000) {
        results.push({ id: String(test.id), passed: false, actual: '', expected, error: 'Test case is too large.' });
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(pistonUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            language: LANGUAGE_MAP[language],
            version: '*',
            files: [{ name: language === 'java' ? 'Solution.java' : `Main.${language === 'python' ? 'py' : language === 'cpp' ? 'cpp' : 'c'}`, content: code }],
            stdin: input,
            args: [],
            compile_timeout: 10000,
            run_timeout: 3000,
            compile_cpu_time: 10000,
            run_cpu_time: 3000,
            compile_memory_limit: -1,
            run_memory_limit: -1,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          results.push({ id: String(test.id), passed: false, actual: '', expected, error: payload?.message || `Code runner returned HTTP ${response.status}.` });
          continue;
        }

        const run = payload?.run;
        const compile = payload?.compile;
        const stderr = [compile?.stderr, run?.stderr].filter(Boolean).join('\n').trim();
        const actual = String(run?.stdout ?? '').trim();
        const passed = run?.code === 0 && !stderr && actual === expected;

        results.push({
          id: String(test.id),
          passed,
          actual: stderr || actual,
          expected,
          ...(stderr || run?.message ? { error: stderr || run?.message } : {}),
        });
      } catch (error) {
        const message = error instanceof Error && error.name === 'AbortError'
          ? 'Code execution timed out.'
          : error instanceof Error ? error.message : 'Unable to reach the code runner.';
        results.push({ id: String(test.id), passed: false, actual: '', expected, error: message });
      } finally {
        clearTimeout(timeout);
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request.' }, { status: 400 });
  }
}
