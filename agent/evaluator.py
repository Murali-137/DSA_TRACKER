from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv
import os, json, re, subprocess, tempfile

load_dotenv()

# ─── Groq Client ──────────────────────────────────────────────────────────────
client = ChatGroq(
    model="llama3-70b-8192",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.0,   # zero temp = deterministic, consistent scoring
)

# ─── System Prompt ────────────────────────────────────────────────────────────
system_prompt = """
You are a strict and accurate DSA (Data Structures & Algorithms) code evaluator.
You will evaluate the user's submitted code against the target problem.

Respond ONLY with valid JSON in this exact structure:
{
  "score": <integer 0 to 10>,
  "is_relevant": <true or false>,
  "is_optimal": <true or false>,
  "feedback": "<2-3 sentences of clear, constructive feedback>"
}

═══ EVALUATION RULES (FOLLOW IN ORDER) ═══

1. PROBLEM RELEVANCE & ANTI-CHEAT (CRITICAL):
   • Check if the code is actually written to solve the specific target problem.
   • If the user submitted code meant for a completely DIFFERENT problem (e.g. submitting Two Sum code for a Linked List, Tree, or DP problem, or random unrelated code):
     -> Set "is_relevant": false, "score": 0, "is_optimal": false.
     -> Feedback: "The submitted code does not solve this problem. It appears to be for a different problem or unrelated."
   • If the code is just an unmodified template or empty/trivial:
     -> Set "score": 0, "is_optimal": false.

2. LOGICAL ACCURACY:
   • Trace whether the code's algorithm correctly computes the expected result for the problem's inputs and edge cases.
   • If the code has syntax/runtime errors or fundamentally wrong logic:
     -> "score": 1 to 3.

3. OPTIMAL COMPLEXITY & SCORING SCALE (For relevant, working code):
   • 10 / 10 (FULL POINTS):
     - Correct algorithm with optimal Time and Space complexity for this problem.
     - Clean, readable implementation handling edge cases.
   • 7 - 8 / 10:
     - Correct algorithm, but slightly suboptimal time or space complexity (e.g. extra space, or O(N log N) when O(N) is expected).
   • 5 - 6 / 10:
     - Correct but brute force approach (e.g. O(N^2) or O(2^N) when an efficient solution exists).
   • 2 - 4 / 10:
     - Partial solution with logic bugs, fails key edge cases.
   • 0 / 10:
     - Unrelated code, empty template, or completely broken.

KEY PRINCIPLE: If the solution is logically correct AND uses the optimal approach for this problem, ALWAYS give score = 10.
"""

# ─── Code Executor ────────────────────────────────────────────────────────────
EXEC_TIMEOUT = 5

def run_python(code: str, sample_input: str) -> dict:
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        fname = f.name
    try:
        result = subprocess.run(
            ['python3', fname],
            input=sample_input or '',
            capture_output=True, text=True,
            timeout=EXEC_TIMEOUT,
        )
        return {
            'actual_output': result.stdout.strip(),
            'error': result.stderr.strip() if result.returncode != 0 else '',
            'timed_out': False,
        }
    except subprocess.TimeoutExpired:
        return {'actual_output': '', 'error': 'Time Limit Exceeded', 'timed_out': True}
    except Exception as e:
        return {'actual_output': '', 'error': str(e), 'timed_out': False}
    finally:
        if os.path.exists(fname):
            os.unlink(fname)


def run_javascript(code: str, sample_input: str) -> dict:
    input_lines = sample_input.split('\n') if sample_input else []
    lines_json = json.dumps(input_lines)
    wrapper = f"""const lines = {lines_json};
let _lineIdx = 0;
const input = () => lines[_lineIdx++] || '';
{code}
"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(wrapper)
        fname = f.name
    try:
        result = subprocess.run(
            ['node', fname],
            capture_output=True, text=True, timeout=EXEC_TIMEOUT,
        )
        return {
            'actual_output': result.stdout.strip(),
            'error': result.stderr.strip() if result.returncode != 0 else '',
            'timed_out': False,
        }
    except subprocess.TimeoutExpired:
        return {'actual_output': '', 'error': 'Time Limit Exceeded', 'timed_out': True}
    except Exception as e:
        return {'actual_output': '', 'error': str(e), 'timed_out': False}
    finally:
        if os.path.exists(fname):
            os.unlink(fname)


def run_code(code: str, language: str, sample_input: str) -> dict:
    lang = language.lower()
    if lang in ('python', 'python3'):
        return run_python(code, sample_input)
    elif lang in ('javascript', 'js', 'typescript', 'ts'):
        return run_javascript(code, sample_input)
    else:
        return {'actual_output': None, 'error': f'Execution skipped for {language}', 'timed_out': False}


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', (text or '').strip().lower())


# ─── Main Evaluate Function ───────────────────────────────────────────────────
def evaluate_code(
    code: str,
    language: str,
    problem_title: str,
    problem_description: str,
    difficulty: str,
    sample_input: str = "",
    sample_output: str = "",
    constraints: str = "",
) -> dict:

    # Step 1: Run the code
    exec_result = run_code(code, language, sample_input)
    actual    = exec_result.get('actual_output', '')
    exec_err  = exec_result.get('error', '')
    timed_out = exec_result.get('timed_out', False)

    # Step 2: Determine pass/fail or function-only status
    has_output = bool(actual and actual.strip())
    
    if timed_out:
        test_result_text = "⏱ TEST EXECUTION: TIME LIMIT EXCEEDED (Code took too long)."
        passed = False
    elif exec_err and not has_output:
        test_result_text = f"❌ TEST EXECUTION: RUNTIME ERROR:\n{exec_err[:300]}"
        passed = False
    elif has_output and sample_output:
        passed = normalize(actual) == normalize(sample_output)
        if passed:
            test_result_text = f"✅ TEST EXECUTION: PASSED\nExpected: {sample_output.strip()}\nGot: {actual}"
        else:
            test_result_text = f"❌ TEST EXECUTION: OUTPUT MISMATCH\nExpected: {sample_output.strip()}\nGot: {actual}"
    else:
        # Function/Class structure without standalone print/I/O execution
        passed = None
        test_result_text = "ℹ TEST EXECUTION: Function/Class definition provided. Evaluate logical correctness and complexity directly from the code implementation."

    # Step 3: Build prompt
    prompt = f"""
TARGET PROBLEM : {problem_title}
DIFFICULTY     : {difficulty.upper()}

DESCRIPTION:
{problem_description}

CONSTRAINTS:
{constraints or "Standard constraints apply."}

SAMPLE INPUT  : {sample_input or "N/A"}
SAMPLE OUTPUT : {sample_output or "N/A"}

{test_result_text}

USER'S SUBMITTED CODE ({language.upper()}):
```{language}
{code}
```

Evaluate the code according to the system instructions.
1. Check if the code addresses THIS specific problem ({problem_title}). If it is for a different problem, return score 0.
2. If it is relevant, check correctness against the sample input/output and constraints.
3. If it is correct and optimal, award full score = 10.
Return JSON only.
"""

    # Step 4: LLM call
    response = client.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt),
    ])

    content = response.content.strip()

    # Step 5: Parse JSON
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r'\{.*?\}', content, re.DOTALL)
        result = json.loads(match.group()) if match else {}

    score       = max(0, min(10, int(result.get("score", 0))))
    is_relevant = result.get("is_relevant", True)
    is_optimal  = result.get("is_optimal", False)
    feedback    = result.get("feedback", "Code evaluated.")

    # ── Strict Enforcement Rules ──────────────────────────────────────────
    # If not relevant to this problem -> strictly 0
    if is_relevant is False:
        score = 0
        is_optimal = False

    # If optimal and relevant -> give 10
    if is_optimal and is_relevant and score >= 7:
        score = 10

    # If LLM gave 9 for optimal code -> boost to 10
    if score == 9 and is_relevant:
        score = 10

    # If test actually executed and passed -> minimum 7
    if passed is True and is_relevant and score < 7:
        score = 7

    # If test executed and had wrong output / runtime error -> cap at 3
    if passed is False and has_output and score > 3:
        score = 3
    # ──────────────────────────────────────────────────────────────────────

    return {"score": score, "feedback": feedback}
