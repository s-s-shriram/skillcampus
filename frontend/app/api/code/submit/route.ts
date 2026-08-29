import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const LANGUAGE_IDS: Record<string, number> = { c: 50, cpp: 54, java: 62, python: 71 };

type TestCase = { id: string; input_data: string; expected_output: string; is_hidden: boolean };
type JudgeResult = { stdout?: string | null; stderr?: string | null; compile_output?: string | null; message?: string | null; status?: { id: number; description: string } };

const normalize = (value: string | null | undefined) => (value ?? '').replace(/\r\n/g, '\n').trim();
const judge0Url = () => (process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/$/, '');

function headers() {
  const result: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.JUDGE0_API_KEY) result['X-Auth-Token'] = process.env.JUDGE0_API_KEY;
  return result;
}

async function execute(languageId: number, code: string, test: TestCase): Promise<JudgeResult> {
  const response = await fetch(`${judge0Url()}/submissions/?base64_encoded=false&wait=true`, {
    method: 'POST', headers: headers(), cache: 'no-store',
    body: JSON.stringify({ language_id: languageId, source_code: code, stdin: test.input_data, expected_output: test.expected_output, cpu_time_limit: 2, wall_time_limit: 5, memory_limit: 128000 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Judge0 returned HTTP ${response.status}.`);
  return data as JudgeResult;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const problemId = typeof body?.problem_id === 'string' ? body.problem_id : '';
    const language = String(body?.language || '').toLowerCase();
    const code = typeof body?.code === 'string' ? body.code : '';
    const auth = request.headers.get('authorization') || '';

    if (!problemId || !LANGUAGE_IDS[language] || !code.trim()) {
      return NextResponse.json({ error: 'Problem, supported language and code are required.' }, { status: 400 });
    }
    if (code.length > 50000) return NextResponse.json({ error: 'Code is too large.' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: 'Server submission configuration is missing.' }, { status: 500 });

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

    const { data: problem, error: problemError } = await admin
      .from('coding_problems').select('id,is_published').eq('id', problemId).single();
    if (problemError || !problem?.is_published) return NextResponse.json({ error: 'Problem not found or not published.' }, { status: 404 });

    const { data: tests, error: testsError } = await admin
      .from('coding_test_cases').select('id,input_data,expected_output,is_hidden').eq('problem_id', problemId).order('created_at', { ascending: true });
    if (testsError) return NextResponse.json({ error: testsError.message }, { status: 500 });
    const allTests = (tests ?? []) as TestCase[];
    if (allTests.length === 0 || allTests.length > 20) return NextResponse.json({ error: 'This problem has no valid test cases.' }, { status: 400 });

    const results = [];
    for (const test of allTests) {
      try {
        const result = await execute(LANGUAGE_IDS[language], code, test);
        const actual = normalize(result.stdout);
        const error = normalize(result.compile_output) || normalize(result.stderr) || normalize(result.message);
        const passed = result.status?.id === 3 && !error && actual === normalize(test.expected_output);
        results.push({ id: test.id, passed, hidden: test.is_hidden, actual: test.is_hidden ? '' : actual, expected: test.is_hidden ? '' : normalize(test.expected_output), error: passed ? undefined : (test.is_hidden ? 'Hidden test case failed.' : error || `Judge0 status: ${result.status?.description || 'Output did not match.'}`) });
      } catch (error) {
        results.push({ id: test.id, passed: false, hidden: test.is_hidden, actual: '', expected: '', error: test.is_hidden ? 'Hidden test case failed.' : (error instanceof Error ? error.message : 'Unable to reach Judge0.') });
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    const accepted = passedCount === results.length;
    return NextResponse.json({ accepted, passed: passedCount, total: results.length, score: Math.round((passedCount / results.length) * 100), results });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid submission.' }, { status: 400 });
  }
}
